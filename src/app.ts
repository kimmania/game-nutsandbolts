import { applyMove, createGameState, isWin, resetGameState, statusLabel } from './core/board';
import { fetchLevel, fetchLevelIndex } from './core/levels';
import type { GameState, LevelDef } from './core/types';
import { configureAudio, playSound, primeAudio } from './game/audio';
import { loadSettings, saveSettings } from './game/settings';
import { applySnapshot, captureSnapshot, type MoveSnapshot } from './game/history';
import {
  clearSession,
  loadProgress,
  loadSession,
  saveProgress,
  saveSession,
  unlockNextLevel,
} from './game/storage';
import { createBoard, renderBoard, resetBoardAnimationState } from './ui/board';
import {
  bindControls,
  setNextEnabled,
  setPrevEnabled,
  setUndoEnabled,
  setStatusChip,
  showWinBanner,
  updateHeader,
} from './ui/controls';
import { closeLevelPicker, openLevelPicker } from './ui/levelPicker';
import { applyMotionClass, closeSettingsPanel, openSettingsPanel } from './ui/settingsPanel';

export class NutsBoltsApp {
  private state: GameState | null = null;
  private levelDef: LevelDef | null = null;
  private levelIds: number[] = [];
  private progress = loadProgress();
  private settings = loadSettings();
  private loading = false;
  private lastRemovedCount = 0;
  private undoSnapshot: MoveSnapshot | null = null;
  private board = createBoard(
    document.getElementById('board-host')!,
    document.getElementById('hint')!,
    (holeId) => this.handleHoleTap(holeId),
  );

  async init(): Promise<void> {
    configureAudio(this.settings);
    applyMotionClass(this.settings.reducedMotion);

    bindControls({
      onRestart: () => this.handleRestart(),
      onNext: () => void this.goToLevel(this.getCurrentLevelId() + 1),
      onPrev: () => void this.goToLevel(this.getCurrentLevelId() - 1),
      onUndo: () => this.handleUndo(),
      onLevels: () => this.openLevels(),
      onSettings: () => this.openSettings(),
    });

    document.addEventListener('keydown', (event) => this.handleKeydown(event));

    document.getElementById('level-meta')?.addEventListener('click', () => this.openLevels());
    document.body.addEventListener(
      'pointerdown',
      () => primeAudio(),
      { once: true },
    );

    this.levelIds = await fetchLevelIndex();
    await this.loadLevel(this.progress.currentLevel);
  }

  private getCurrentLevelId(): number {
    return this.state?.levelId ?? this.progress.currentLevel;
  }

  private openLevels(): void {
    openLevelPicker({
      levelIds: this.levelIds,
      currentLevel: this.getCurrentLevelId(),
      highestUnlocked: this.progress.highestUnlocked,
      onSelect: (id) => void this.goToLevel(id),
      onClose: closeLevelPicker,
    });
  }

  private openSettings(): void {
    openSettingsPanel({
      settings: this.settings,
      onChange: (settings) => {
        this.settings = settings;
        saveSettings(settings);
        configureAudio(settings);
        applyMotionClass(settings.reducedMotion);
        this.refresh();
      },
      onClose: closeSettingsPanel,
    });
  }

  private async loadLevel(levelId: number): Promise<void> {
    if (this.loading) return;
    if (!this.levelIds.includes(levelId)) {
      levelId = this.levelIds[0] ?? 1;
    }

    this.loading = true;
    try {
      const level = await fetchLevel(levelId);
      this.levelDef = level;
      resetBoardAnimationState(this.board);

      const session = loadSession(levelId);
      if (session && session.status === 'playing') {
        this.state = {
          levelId: level.id,
          levelName: level.name,
          holes: session.holes,
          plates: session.plates,
          pickedScrew: session.pickedScrew,
          status: session.status,
        };
      } else {
        this.state = createGameState(level);
      }

      this.lastRemovedCount = this.state.plates.filter((plate) => plate.removed).length;
      this.clearUndo();
      this.progress = { ...this.progress, currentLevel: levelId };
      saveProgress(this.progress);
      this.refresh();
    } catch (error) {
      console.error(error);
      alert('Could not load level. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private async goToLevel(levelId: number): Promise<void> {
    if (levelId < 1 || levelId > (this.levelIds.at(-1) ?? 1)) return;
    if (levelId > this.progress.highestUnlocked) return;
    clearSession(this.getCurrentLevelId());
    await this.loadLevel(levelId);
  }

  private clearUndo(): void {
    this.undoSnapshot = null;
  }

  private handleUndo(): void {
    if (!this.state || !this.undoSnapshot || this.state.status === 'won') return;

    applySnapshot(this.state, this.undoSnapshot);
    this.clearUndo();
    this.lastRemovedCount = this.state.plates.filter((plate) => plate.removed).length;

    if (this.state.status === 'playing') {
      saveSession(this.state.levelId, this.state);
    }

    this.refresh();
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.state || this.state.status === 'won') return;
    if (!(event.metaKey || event.ctrlKey) || event.key !== 'z') return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT') return;

    event.preventDefault();
    this.handleUndo();
  }

  private handleHoleTap(holeId: string): void {
    if (!this.state || this.state.status === 'won') return;

    const snapshot = captureSnapshot(this.state);
    const result = applyMove(this.state, holeId);

    if (result === 'ignored') {
      if (this.state.status === 'playing') playSound('tap');
      return;
    }

    this.undoSnapshot = snapshot;

    if (result === 'picked') playSound('pick');
    if (result === 'placed') playSound('place');

    const removedCount = this.state.plates.filter((plate) => plate.removed).length;
    if (removedCount > this.lastRemovedCount) {
      playSound('drop');
    }
    this.lastRemovedCount = removedCount;

    if (isWin(this.state)) {
      this.state.status = 'won';
      this.clearUndo();
      clearSession(this.state.levelId);
      playSound('win');
      const maxId = this.levelIds.at(-1) ?? this.state.levelId;
      if (this.state.levelId < maxId) {
        this.progress = unlockNextLevel(this.progress, this.state.levelId);
        saveProgress(this.progress);
      }
    } else if (this.state.status === 'stuck') {
      playSound('jam');
      this.clearUndo();
      clearSession(this.state.levelId);
    } else if (this.state.status === 'playing') {
      saveSession(this.state.levelId, this.state);
    }

    this.refresh();
  }

  private handleRestart(): void {
    if (!this.state || !this.levelDef) return;
    resetGameState(this.state, this.levelDef);
    resetBoardAnimationState(this.board);
    this.lastRemovedCount = 0;
    this.clearUndo();
    clearSession(this.state.levelId);
    this.refresh();
  }

  private refresh(): void {
    if (!this.state) return;

    renderBoard(this.board, this.state, { reducedMotion: this.settings.reducedMotion });
    updateHeader(this.state.levelName, this.state.levelId, this.levelIds.length);
    setStatusChip(statusLabel(this.state.status), this.state.status);
    showWinBanner(this.state.status === 'won');

    const maxUnlocked = this.progress.highestUnlocked;
    const lastLevel = this.levelIds.at(-1) ?? 1;
    setPrevEnabled(this.state.levelId > 1);
    setNextEnabled(
      this.state.levelId < lastLevel &&
        (this.state.status === 'won' || this.state.levelId < maxUnlocked),
    );
    setUndoEnabled(this.undoSnapshot !== null && this.state.status === 'playing');
  }
}

export async function bootstrap(): Promise<void> {
  const app = new NutsBoltsApp();
  await app.init();
}
