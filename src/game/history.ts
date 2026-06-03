import type { GameState, GameStatus, HoleState, PlateState, ScrewId } from '../core/types';

export type MoveSnapshot = {
  holes: HoleState[];
  plates: PlateState[];
  pickedScrew: ScrewId | null;
  status: GameStatus;
};

function cloneHoles(holes: HoleState[]): HoleState[] {
  return holes.map((hole) => ({ ...hole }));
}

function clonePlates(plates: PlateState[]): PlateState[] {
  return plates.map((plate) => ({
    ...plate,
    anchors: [...plate.anchors],
  }));
}

export function captureSnapshot(state: GameState): MoveSnapshot {
  return {
    holes: cloneHoles(state.holes),
    plates: clonePlates(state.plates),
    pickedScrew: state.pickedScrew,
    status: state.status,
  };
}

export function applySnapshot(state: GameState, snapshot: MoveSnapshot): void {
  state.holes = cloneHoles(snapshot.holes);
  state.plates = clonePlates(snapshot.plates);
  state.pickedScrew = snapshot.pickedScrew;
  state.status = snapshot.status;
}
