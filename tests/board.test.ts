import { describe, expect, it } from 'vitest';
import {
  applyMove,
  canPickScrew,
  canPlaceScrew,
  createGameState,
  hasLegalMove,
  isWin,
  pickScrew,
  placeScrew,
  resetGameState,
  syncGameState,
} from '../src/core/board';
import type { LevelDef } from '../src/core/types';

const level1: LevelDef = {
  id: 1,
  name: 'Test',
  holes: [
    { id: 'h1', x: 0, y: 0, kind: 'board' },
    { id: 'h2', x: 0, y: 0, kind: 'board' },
    { id: 's1', x: 0, y: 0, kind: 'stash' },
    { id: 's2', x: 0, y: 0, kind: 'stash' },
  ],
  plates: [{ id: 'p1', layer: 0, anchors: ['h1', 'h2'], width: 100, height: 20 }],
  screws: { h1: 'a', h2: 'b' },
};

const levelStacked: LevelDef = {
  id: 99,
  name: 'Stacked test',
  holes: [
    { id: 'h1', x: 0, y: 0, kind: 'board' },
    { id: 'h2', x: 0, y: 0, kind: 'board' },
    { id: 'h3', x: 0, y: 0, kind: 'board' },
    { id: 's1', x: 0, y: 0, kind: 'stash' },
    { id: 's2', x: 0, y: 0, kind: 'stash' },
  ],
  plates: [
    { id: 'base', layer: 0, anchors: ['h1', 'h2'], width: 100, height: 20 },
    { id: 'cap', layer: 1, anchors: ['h2', 'h3'], width: 80, height: 20 },
  ],
  screws: { h1: 'a', h2: 'b', h3: 'c' },
};

describe('createGameState', () => {
  it('starts in playing state with screws on board', () => {
    const state = createGameState(level1);
    expect(state.status).toBe('playing');
    expect(state.pickedScrew).toBeNull();
    expect(state.holes.find((h) => h.id === 'h1')?.screwId).toBe('a');
    expect(state.plates[0]?.removed).toBe(false);
  });
});

describe('pick and place', () => {
  it('clears a plate when all anchors are empty, including with bolt in hand', () => {
    const state = createGameState(level1);
    expect(pickScrew(state, 'h1')).toBe(true);
    expect(placeScrew(state, 's1')).toBe(true);
    expect(pickScrew(state, 'h2')).toBe(true);
    expect(state.plates[0]?.removed).toBe(true);
    expect(isWin(state)).toBe(true);
    expect(state.status).toBe('won');
  });

  it('clears a 3-anchor plate after parking two bolts and picking the third', () => {
    const level: LevelDef = {
      id: 100,
      name: 'Three anchors',
      holes: [
        { id: 'h1', x: 0, y: 0, kind: 'board' },
        { id: 'h2', x: 0, y: 0, kind: 'board' },
        { id: 'h3', x: 0, y: 0, kind: 'board' },
        { id: 's1', x: 0, y: 0, kind: 'stash' },
        { id: 's2', x: 0, y: 0, kind: 'stash' },
      ],
      plates: [{ id: 'p', layer: 0, anchors: ['h1', 'h2', 'h3'], width: 100, height: 20 }],
      screws: { h1: 'a', h2: 'b', h3: 'c' },
    };
    const state = createGameState(level);
    pickScrew(state, 'h1');
    placeScrew(state, 's1');
    pickScrew(state, 'h2');
    placeScrew(state, 's2');
    pickScrew(state, 'h3');
    expect(state.plates[0]?.removed).toBe(true);
    expect(isWin(state)).toBe(true);
  });

  it('allows picking a shared screw when a top-layer plate uses the hole', () => {
    const state = createGameState(levelStacked);
    expect(canPickScrew(state, 'h2')).toBe(true);
    expect(canPickScrew(state, 'h3')).toBe(true);
    expect(canPickScrew(state, 'h1')).toBe(true);
  });

  it('applyMove picks then places on subsequent taps', () => {
    const state = createGameState(level1);
    expect(applyMove(state, 'h1')).toBe('picked');
    expect(applyMove(state, 's1')).toBe('placed');
    expect(state.pickedScrew).toBeNull();
  });

  it('cannot place on occupied hole', () => {
    const state = createGameState(level1);
    pickScrew(state, 'h1');
    expect(canPlaceScrew(state, 'h2')).toBe(false);
  });

  it('reset restores initial layout', () => {
    const state = createGameState(level1);
    pickScrew(state, 'h1');
    resetGameState(state, level1);
    expect(state.holes.find((h) => h.id === 'h1')?.screwId).toBe('a');
    expect(state.status).toBe('playing');
  });
});

describe('stuck detection', () => {
  it('marks stuck when bolt is in hand and every hole is full', () => {
    const state = createGameState(level1);
    state.pickedScrew = 'a';
    for (const hole of state.holes) {
      hole.screwId = 'filled';
    }
    syncGameState(state);
    expect(hasLegalMove(state)).toBe(false);
    expect(state.status).toBe('stuck');
  });
});
