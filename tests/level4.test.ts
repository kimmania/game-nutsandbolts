import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createGameState, isWin, pickScrew, placeScrew } from '../src/core/board';
import type { LevelDef } from '../src/core/types';

const level4 = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'levels', '4.json'),
    'utf8',
  ),
) as LevelDef;

describe('level 4', () => {
  it('is solvable with two spare holes', () => {
    const state = createGameState(level4);

    // Clear the two-bolt plate first
    pickScrew(state, 'h3');
    placeScrew(state, 's1');
    pickScrew(state, 'h5');
    placeScrew(state, 's2');
    expect(state.plates.find((p) => p.id === 'p-b')?.removed).toBe(true);

    // Free spare holes, then clear the three-bolt plate
    pickScrew(state, 's1');
    placeScrew(state, 'h3');
    pickScrew(state, 's2');
    placeScrew(state, 'h5');

    pickScrew(state, 'h1');
    placeScrew(state, 's1');
    pickScrew(state, 'h2');
    placeScrew(state, 's2');
    pickScrew(state, 'h4');
    expect(state.plates.find((p) => p.id === 'p-a')?.removed).toBe(true);
    expect(isWin(state)).toBe(true);
  });
});
