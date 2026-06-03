import type {
  GameState,
  GameStatus,
  HoleId,
  HoleState,
  LevelDef,
  PlateState,
} from './types';

export function createGameState(level: LevelDef): GameState {
  const holes: HoleState[] = level.holes.map((hole) => ({
    id: hole.id,
    x: hole.x,
    y: hole.y,
    kind: hole.kind,
    screwId: level.screws[hole.id] ?? null,
  }));

  const plates: PlateState[] = level.plates.map((plate) => ({
    id: plate.id,
    layer: plate.layer,
    anchors: [...plate.anchors],
    width: plate.width,
    height: plate.height,
    removed: false,
  }));

  const state: GameState = {
    levelId: level.id,
    levelName: level.name,
    holes,
    plates,
    pickedScrew: null,
    status: 'playing',
  };

  refreshPlateRemoval(state);
  refreshStatus(state);
  return state;
}

export function getHole(state: GameState, holeId: HoleId): HoleState | undefined {
  return state.holes.find((hole) => hole.id === holeId);
}

function activePlatesAtHole(state: GameState, holeId: HoleId): PlateState[] {
  return state.plates.filter(
    (plate) => !plate.removed && plate.anchors.includes(holeId),
  );
}

/**
 * A screw can be removed when it is exposed from above: at least one
 * non-removed plate at this hole is on the top layer. Lower plates may
 * still share the same hole (one physical pin through both sheets).
 */
export function canPickScrew(state: GameState, holeId: HoleId): boolean {
  if (state.status !== 'playing' || state.pickedScrew !== null) return false;

  const hole = getHole(state, holeId);
  if (!hole?.screwId) return false;

  const platesAtHole = activePlatesAtHole(state, holeId);
  if (platesAtHole.length === 0) return true;

  const topLayer = Math.max(...platesAtHole.map((plate) => plate.layer));
  return platesAtHole.some((plate) => plate.layer === topLayer);
}

export function pickScrew(state: GameState, holeId: HoleId): boolean {
  if (!canPickScrew(state, holeId)) return false;

  const hole = getHole(state, holeId);
  if (!hole?.screwId) return false;

  state.pickedScrew = hole.screwId;
  hole.screwId = null;
  refreshPlateRemoval(state);
  refreshStatus(state);
  return true;
}

export function canPlaceScrew(state: GameState, holeId: HoleId): boolean {
  if (state.status !== 'playing' || state.pickedScrew === null) return false;

  const hole = getHole(state, holeId);
  return hole !== undefined && hole.screwId === null;
}

export function placeScrew(state: GameState, holeId: HoleId): boolean {
  if (!canPlaceScrew(state, holeId)) return false;

  const hole = getHole(state, holeId);
  if (!hole) return false;

  hole.screwId = state.pickedScrew;
  state.pickedScrew = null;
  refreshPlateRemoval(state);
  refreshStatus(state);
  return true;
}

/** Plate falls once every anchor hole is empty (bolt may still be in hand). */
export function refreshPlateRemoval(state: GameState): void {
  for (const plate of state.plates) {
    if (plate.removed) continue;
    const allAnchorsEmpty = plate.anchors.every((holeId) => {
      const hole = getHole(state, holeId);
      return hole !== undefined && hole.screwId === null;
    });
    if (allAnchorsEmpty) {
      plate.removed = true;
    }
  }
}

export function isWin(state: GameState): boolean {
  return state.plates.every((plate) => plate.removed);
}

export function hasLegalMove(state: GameState): boolean {
  if (state.status !== 'playing') return false;

  if (state.pickedScrew !== null) {
    return state.holes.some((hole) => canPlaceScrew(state, hole.id));
  }

  return state.holes.some((hole) => canPickScrew(state, hole.id));
}

function refreshStatus(state: GameState): void {
  if (isWin(state)) {
    state.status = 'won';
    state.pickedScrew = null;
    return;
  }

  if (!hasLegalMove(state)) {
    state.status = 'stuck';
  } else if (state.status === 'stuck') {
    state.status = 'playing';
  }
}

export function resetGameState(state: GameState, level: LevelDef): void {
  const fresh = createGameState(level);
  state.levelId = fresh.levelId;
  state.levelName = fresh.levelName;
  state.holes = fresh.holes;
  state.plates = fresh.plates;
  state.pickedScrew = fresh.pickedScrew;
  state.status = fresh.status;
}

export function applyMove(
  state: GameState,
  holeId: HoleId,
): 'picked' | 'placed' | 'ignored' {
  if (state.status !== 'playing') return 'ignored';

  if (state.pickedScrew !== null) {
    return placeScrew(state, holeId) ? 'placed' : 'ignored';
  }

  return pickScrew(state, holeId) ? 'picked' : 'ignored';
}

export function syncGameState(state: GameState): void {
  refreshPlateRemoval(state);
  refreshStatus(state);
}

export function stashUsedCount(state: GameState): number {
  return state.holes.filter((hole) => hole.kind === 'stash' && hole.screwId !== null).length;
}

export function stashCapacity(state: GameState): number {
  return state.holes.filter((hole) => hole.kind === 'stash').length;
}

export function statusLabel(status: GameStatus): string {
  switch (status) {
    case 'won':
      return 'Cleared!';
    case 'stuck':
      return 'Screw jam — restart';
    default:
      return 'Playing';
  }
}
