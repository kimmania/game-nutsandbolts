import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createGameState, isWin, pickScrew, placeScrew } from '../src/core/board';
import type { LevelDef } from '../src/core/types';

const level9 = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'levels', '9.json'),
    'utf8',
  ),
) as LevelDef;

describe('level 9 cross', () => {
  it('is solvable', () => {
    const state = createGameState(level9);

    pickScrew(state, 'h4');
    placeScrew(state, 's1');
    pickScrew(state, 'h2');
    placeScrew(state, 's2');
    pickScrew(state, 'h1');
    placeScrew(state, 's3');
    pickScrew(state, 'h3');

    expect(isWin(state)).toBe(true);
  });
});
