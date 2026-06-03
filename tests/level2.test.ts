import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/core/board';
import type { LevelDef } from '../src/core/types';
import { canPlateHang, plateLayout } from '../src/ui/plateLayout';

const level2 = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'levels', '2.json'),
    'utf8',
  ),
) as LevelDef;

describe('level 2 two bars', () => {
  it('uses separate anchors per plate (no implied shared pins)', () => {
    const top = level2.plates.find((p) => p.id === 'p-top')!;
    const bottom = level2.plates.find((p) => p.id === 'p-bottom')!;
    const topSet = new Set(top.anchors);
    for (const id of bottom.anchors) {
      expect(topSet.has(id)).toBe(false);
    }
  });

  it('allows the top bar to hang when only one screw remains', () => {
    const state = createGameState(level2);
    const top = state.plates.find((p) => p.id === 'p-top')!;

    const h2 = state.holes.find((h) => h.id === 'h2')!;
    h2.screwId = null;

    expect(canPlateHang(top, state.holes, state.plates)).toBe(true);
    expect(plateLayout(top, state.holes, state.plates).mode).toBe('hang');
  });
});
