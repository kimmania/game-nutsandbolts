import {
  applyMove,
  canPickScrew,
  canPlaceScrew,
  createGameState,
} from './board';
import type { GameState, HoleId, LevelDef } from './types';

export type SolverOptions = {
  /** Stop after visiting this many states (safety cap). */
  maxStates?: number;
};

export type SolverResult = {
  solvable: boolean;
  statesExplored: number;
};

function cloneState(state: GameState): GameState {
  return {
    levelId: state.levelId,
    levelName: state.levelName,
    pickedScrew: state.pickedScrew,
    status: state.status,
    holes: state.holes.map((hole) => ({ ...hole })),
    plates: state.plates.map((plate) => ({
      ...plate,
      anchors: [...plate.anchors],
    })),
  };
}

/** Compact key for BFS deduplication (hole bolts, plate removal, bolt in hand). */
export function stateKey(state: GameState): string {
  const holes = state.holes.map((hole) => hole.screwId ?? '-').join(',');
  const plates = state.plates.map((plate) => (plate.removed ? '1' : '0')).join('');
  const hand = state.pickedScrew ?? '';
  return `${holes}|${plates}|${hand}`;
}

function legalMoveTargets(state: GameState): HoleId[] {
  if (state.status !== 'playing') return [];

  if (state.pickedScrew !== null) {
    return state.holes.filter((hole) => canPlaceScrew(state, hole.id)).map((hole) => hole.id);
  }

  return state.holes.filter((hole) => canPickScrew(state, hole.id)).map((hole) => hole.id);
}

/**
 * Breadth-first search over pick/place moves using the same rules as gameplay.
 */
export function solveLevel(level: LevelDef, options: SolverOptions = {}): SolverResult {
  const maxStates = options.maxStates ?? 500_000;
  const start = createGameState(level);

  if (start.status === 'won') {
    return { solvable: true, statesExplored: 1 };
  }
  if (start.status === 'stuck') {
    return { solvable: false, statesExplored: 1 };
  }

  const visited = new Set<string>([stateKey(start)]);
  const queue: GameState[] = [start];
  let head = 0;

  while (head < queue.length) {
    const state = queue[head++];
    const moves = legalMoveTargets(state);

    for (const holeId of moves) {
      const next = cloneState(state);
      applyMove(next, holeId);

      if (next.status === 'won') {
        return { solvable: true, statesExplored: visited.size + 1 };
      }

      if (next.status !== 'playing') continue;

      const key = stateKey(next);
      if (visited.has(key)) continue;
      if (visited.size >= maxStates) {
        return { solvable: false, statesExplored: visited.size };
      }

      visited.add(key);
      queue.push(next);
    }
  }

  return { solvable: false, statesExplored: visited.size };
}

export function isLevelSolvable(level: LevelDef, options?: SolverOptions): boolean {
  return solveLevel(level, options).solvable;
}
