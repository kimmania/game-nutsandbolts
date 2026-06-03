import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createGameState, pickScrew, placeScrew } from '../src/core/board';
import { isLevelSolvable, solveLevel, stateKey } from '../src/core/solver';
import type { LevelDef } from '../src/core/types';

const levelsRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'levels');

function loadLevel(id: number): LevelDef {
  return JSON.parse(readFileSync(join(levelsRoot, `${id}.json`), 'utf8')) as LevelDef;
}

/** 3-anchor plate with only one stash — cannot free all anchors. */
const impossibleLevel: LevelDef = {
  id: 900,
  name: 'Impossible',
  holes: [
    { id: 'h1', x: 100, y: 200, kind: 'board' },
    { id: 'h2', x: 200, y: 200, kind: 'board' },
    { id: 'h3', x: 300, y: 200, kind: 'board' },
    { id: 's1', x: 200, y: 400, kind: 'stash' },
  ],
  plates: [{ id: 'tripod', layer: 0, anchors: ['h1', 'h2', 'h3'], width: 160, height: 32 }],
  screws: { h1: 'a', h2: 'b', h3: 'c' },
};

describe('solver', () => {
  it('detects a known win sequence for level 5', () => {
    expect(isLevelSolvable(loadLevel(5))).toBe(true);
  });

  it('reports unsolvable when a 3-anchor plate has only one stash', () => {
    const result = solveLevel(impossibleLevel);
    expect(result.solvable).toBe(false);
    expect(result.statesExplored).toBeGreaterThan(0);
  });

  it('deduplicates states with the same key', () => {
    const state = createGameState(loadLevel(1));
    const keyA = stateKey(state);
    pickScrew(state, 'h1');
    const keyB = stateKey(state);
    expect(keyA).not.toBe(keyB);
    placeScrew(state, 's1');
    pickScrew(state, 'h2');
    placeScrew(state, 's2');
    expect(state.status).toBe('won');
  });

  it('marks every shipped level as solvable', () => {
    const ids = JSON.parse(readFileSync(join(levelsRoot, 'index.json'), 'utf8')) as number[];
    for (const id of ids) {
      const level = loadLevel(id);
      expect(isLevelSolvable(level), `level ${id} ${level.name}`).toBe(true);
    }
  });
});
