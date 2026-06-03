export type HoleKind = 'board' | 'stash';

export type HoleId = string;
export type ScrewId = string;
export type PlateId = string;

export type HoleDef = {
  id: HoleId;
  x: number;
  y: number;
  kind: HoleKind;
};

export type PlateDef = {
  id: PlateId;
  layer: number;
  anchors: HoleId[];
  width: number;
  height: number;
};

export type LevelDef = {
  id: number;
  name: string;
  holes: HoleDef[];
  plates: PlateDef[];
  /** hole id -> screw id */
  screws: Record<HoleId, ScrewId>;
};

export type HoleState = {
  id: HoleId;
  x: number;
  y: number;
  kind: HoleKind;
  screwId: ScrewId | null;
};

export type PlateState = {
  id: PlateId;
  layer: number;
  anchors: HoleId[];
  width: number;
  height: number;
  removed: boolean;
};

export type GameStatus = 'playing' | 'won' | 'stuck';

export type GameState = {
  levelId: number;
  levelName: string;
  holes: HoleState[];
  plates: PlateState[];
  pickedScrew: ScrewId | null;
  status: GameStatus;
};
