import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { canPickScrew, createGameState, isWin, pickScrew, placeScrew } from '../src/core/board';
import type { LevelDef } from '../src/core/types';

const level5 = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'levels', '5.json'),
    'utf8',
  ),
) as LevelDef;

describe('level 5', () => {
  it('allows picking the shared screw at h2', () => {
    const state = createGameState(level5);
    expect(canPickScrew(state, 'h2')).toBe(true);
  });

  it('is solvable', () => {
    const state = createGameState(level5);

    pickScrew(state, 'h4');
    placeScrew(state, 's1');
    pickScrew(state, 'h2');
    placeScrew(state, 's2');
    expect(state.plates.find((p) => p.id === 'p-cap')?.removed).toBe(true);

    pickScrew(state, 'h1');
    placeScrew(state, 's3');
    pickScrew(state, 'h2');
    expect(state.plates.find((p) => p.id === 'p-base')?.removed).toBe(true);
    expect(isWin(state)).toBe(true);
  });
});
