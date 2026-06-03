import { describe, expect, it, vi } from 'vitest';
import {
  findInProgressLevelIds,
  findResumeLevel,
  getCompletedLevelIds,
  saveSession,
  unlockNextLevel,
  type SavedProgress,
} from '../src/game/storage';
import { resolveLevelCellStatus } from '../src/ui/levelPicker';
import type { GameState } from '../src/core/types';

const playingSnapshot: Pick<GameState, 'holes' | 'plates' | 'pickedScrew' | 'status'> = {
  holes: [{ id: 'h1', x: 0, y: 0, kind: 'board', screwId: 'a' }],
  plates: [
    { id: 'p', layer: 0, anchors: ['h1'], width: 10, height: 10, removed: false },
  ],
  pickedScrew: null,
  status: 'playing',
};

describe('level picker status', () => {
  const base: SavedProgress = {
    highestUnlocked: 4,
    currentLevel: 3,
    completedLevels: [1, 2],
  };

  it('marks locked, current, completed, and in-progress cells', () => {
    const opts = {
      currentLevel: 3,
      highestUnlocked: 4,
      completedLevelIds: getCompletedLevelIds(base),
      inProgressLevelIds: new Set([4]),
    };

    expect(resolveLevelCellStatus(5, opts)).toBe('locked');
    expect(resolveLevelCellStatus(3, opts)).toBe('current');
    expect(resolveLevelCellStatus(1, opts)).toBe('completed');
    expect(resolveLevelCellStatus(4, opts)).toBe('progress');
    expect(resolveLevelCellStatus(2, { ...opts, currentLevel: 5 })).toBe('completed');
  });
});

describe('resume level', () => {
  it('finds the highest in-progress level', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });

    saveSession(2, playingSnapshot as GameState);
    saveSession(5, playingSnapshot as GameState);

    const ids = [1, 2, 3, 4, 5, 6];
    expect(findInProgressLevelIds(ids, 6)).toEqual([2, 5]);
    expect(findResumeLevel(ids, 6)).toBe(5);

    vi.unstubAllGlobals();
  });

  it('records completed levels on win', () => {
    const next = unlockNextLevel({ highestUnlocked: 1, currentLevel: 1 }, 1);
    expect(getCompletedLevelIds(next).has(1)).toBe(true);
    expect(next.highestUnlocked).toBe(2);
  });
});
