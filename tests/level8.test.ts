import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createGameState, pickScrew, placeScrew } from '../src/core/board';
import type { LevelDef } from '../src/core/types';
import { canPlateHang, plateLayout, screwsOnPlate } from '../src/ui/plateLayout';

const level8 = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'levels', '8.json'),
    'utf8',
  ),
) as LevelDef;

describe('level 8 twin towers', () => {
  it('does not hang a tower while the cap still shares its top screw', () => {
    const state = createGameState(level8);
    const left = state.plates.find((p) => p.id === 'left')!;

    pickScrew(state, 'h2');
    placeScrew(state, 's1');

    expect(screwsOnPlate(left, state.holes)).toBe(1);
    expect(canPlateHang(left, state.holes, state.plates)).toBe(false);
    expect(plateLayout(left, state.holes, state.plates).mode).toBe('rigid');
  });
});
