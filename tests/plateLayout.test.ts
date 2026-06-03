import { describe, expect, it } from 'vitest';
import { createGameState, pickScrew, placeScrew } from '../src/core/board';
import type { LevelDef } from '../src/core/types';
import {
  plateLayout,
  plateLayoutRigidTransform,
  screwsOnPlate,
} from '../src/ui/plateLayout';

const twoBarLevel: LevelDef = {
  id: 99,
  name: 'Two bar',
  holes: [
    { id: 'h1', x: 100, y: 200, kind: 'board' },
    { id: 'h2', x: 300, y: 200, kind: 'board' },
    { id: 's1', x: 200, y: 458, kind: 'stash' },
  ],
  plates: [
    {
      id: 'bar',
      layer: 0,
      anchors: ['h1', 'h2'],
      width: 120,
      height: 32,
    },
  ],
  screws: { h1: 'a', h2: 'b' },
};

describe('plateLayout', () => {
  it('uses rigid mode with two screws on a two-anchor bar', () => {
    const state = createGameState(twoBarLevel);
    const layout = plateLayout(state.plates[0], state.holes, state.plates);
    expect(layout.mode).toBe('rigid');
    expect(screwsOnPlate(state.plates[0], state.holes)).toBe(2);
    expect(layout.hangAngle).toBeCloseTo(0, 5);
    expect(layout.transform).toContain('translate(200 200)');
    expect(layout.transform).toContain('rotate(0');
  });

  it('hangs from the remaining screw when one anchor is empty', () => {
    const state = createGameState(twoBarLevel);
    pickScrew(state, 'h2');
    placeScrew(state, 's1');

    const layout = plateLayout(state.plates[0], state.holes, state.plates);
    expect(layout.mode).toBe('hang');
    expect(screwsOnPlate(state.plates[0], state.holes)).toBe(1);
    expect(layout.hangAngle).toBeCloseTo(90, 5);
    expect(layout.transform).toContain('translate(100 200)');
  });

  it('tilts the other way when the right screw remains', () => {
    const state = createGameState(twoBarLevel);
    pickScrew(state, 'h1');
    placeScrew(state, 's1');

    const layout = plateLayout(state.plates[0], state.holes, state.plates);
    expect(layout.mode).toBe('hang');
    expect(layout.hangAngle).toBeCloseTo(-90, 5);
    expect(layout.transform).toContain('translate(300 200)');
  });

  it('keeps a vertical two-screw bar thin horizontally', () => {
    const level: LevelDef = {
      id: 98,
      name: 'Vertical bar',
      holes: [
        { id: 'h1', x: 120, y: 160, kind: 'board' },
        { id: 'h2', x: 120, y: 240, kind: 'board' },
      ],
      plates: [
        { id: 'tower', layer: 0, anchors: ['h1', 'h2'], width: 70, height: 36 },
      ],
      screws: { h1: 'a', h2: 'b' },
    };
    const state = createGameState(level);
    const layout = plateLayout(state.plates[0], state.holes, state.plates);

    expect(layout.width).toBeLessThanOrEqual(130);
    expect(layout.height).toBeLessThanOrEqual(40);
  });

  it('hang transform pivots on the screw still in the board', () => {
    const state = createGameState(twoBarLevel);
    pickScrew(state, 'h2');
    placeScrew(state, 's1');

    const rigid = plateLayoutRigidTransform(state.plates[0], state.holes);
    const hang = plateLayout(state.plates[0], state.holes, state.plates).transform;
    expect(rigid).toContain('translate(200 200)');
    expect(hang).toContain('translate(100 200)');
  });
});
