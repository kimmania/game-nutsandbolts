import { describe, expect, it } from 'vitest';
import { applyMove, createGameState } from '../src/core/board';
import type { LevelDef } from '../src/core/types';
import { applySnapshot, captureSnapshot } from '../src/game/history';

const level: LevelDef = {
  id: 1,
  name: 'Undo test',
  holes: [
    { id: 'h1', x: 0, y: 0, kind: 'board' },
    { id: 'h2', x: 0, y: 0, kind: 'board' },
    { id: 's1', x: 0, y: 0, kind: 'stash' },
    { id: 's2', x: 0, y: 0, kind: 'stash' },
  ],
  plates: [{ id: 'p1', layer: 0, anchors: ['h1', 'h2'], width: 100, height: 20 }],
  screws: { h1: 'a', h2: 'b' },
};

describe('move history', () => {
  it('restores board before last pick', () => {
    const state = createGameState(level);
    const before = captureSnapshot(state);
    applyMove(state, 'h1');
    applySnapshot(state, before);

    expect(state.holes.find((h) => h.id === 'h1')?.screwId).toBe('a');
    expect(state.pickedScrew).toBeNull();
  });

  it('restores board before last place', () => {
    const state = createGameState(level);
    applyMove(state, 'h1');
    const beforePlace = captureSnapshot(state);
    applyMove(state, 's1');
    applySnapshot(state, beforePlace);

    expect(state.pickedScrew).toBe('a');
    expect(state.holes.find((h) => h.id === 's1')?.screwId).toBeNull();
  });
});
