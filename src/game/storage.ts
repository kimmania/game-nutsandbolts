import type { GameState } from '../core/types';

const STORAGE_KEY = 'nutsandbolts-progress';

export type SavedProgress = {
  highestUnlocked: number;
  currentLevel: number;
};

export function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { highestUnlocked: 1, currentLevel: 1 };
    const parsed = JSON.parse(raw) as SavedProgress;
    if (
      typeof parsed.highestUnlocked === 'number' &&
      typeof parsed.currentLevel === 'number' &&
      parsed.highestUnlocked >= 1 &&
      parsed.currentLevel >= 1
    ) {
      return parsed;
    }
  } catch {
    /* ignore corrupt data */
  }
  return { highestUnlocked: 1, currentLevel: 1 };
}

export function saveProgress(progress: SavedProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function saveSession(levelId: number, state: GameState): void {
  const key = `${STORAGE_KEY}:level:${levelId}`;
  localStorage.setItem(
    key,
    JSON.stringify({
      holes: state.holes,
      plates: state.plates,
      pickedScrew: state.pickedScrew,
      status: state.status,
    }),
  );
}

export type SessionSnapshot = Pick<GameState, 'holes' | 'plates' | 'pickedScrew' | 'status'>;

export function loadSession(levelId: number): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:level:${levelId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    return null;
  }
}

export function clearSession(levelId: number): void {
  localStorage.removeItem(`${STORAGE_KEY}:level:${levelId}`);
}

export function unlockNextLevel(progress: SavedProgress, completedLevelId: number): SavedProgress {
  const next = completedLevelId + 1;
  return {
    highestUnlocked: Math.max(progress.highestUnlocked, next),
    currentLevel: next,
  };
}
