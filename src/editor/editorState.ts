import { STASH_HOLE_Y } from '../ui/viewLayout';
import type { HoleDef, LevelDef, PlateDef } from '../core/types';

export type EditorTool =
  | 'board-hole'
  | 'stash-hole'
  | 'screw'
  | 'plate-anchor'
  | 'move'
  | 'erase';

export type EditorDraft = {
  id: number;
  name: string;
  holes: HoleDef[];
  plates: PlateDef[];
  screws: Record<string, string>;
};

export function draftFromLevel(level: LevelDef): EditorDraft {
  return {
    id: level.id,
    name: level.name,
    holes: level.holes.map((hole) => ({ ...hole })),
    plates: level.plates.map((plate) => ({
      ...plate,
      anchors: [...plate.anchors],
    })),
    screws: { ...level.screws },
  };
}

export function createEmptyDraft(): EditorDraft {
  return {
    id: 99,
    name: 'New level',
    holes: [],
    plates: [],
    screws: {},
  };
}

export function toLevelDef(draft: EditorDraft): LevelDef {
  return {
    id: draft.id,
    name: draft.name,
    holes: draft.holes.map((hole) => ({ ...hole })),
    plates: draft.plates.map((plate) => ({
      ...plate,
      anchors: [...plate.anchors],
    })),
    screws: { ...draft.screws },
  };
}

function nextId(prefix: string, existing: string[]): string {
  let n = 1;
  while (existing.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function snapBoardCoord(x: number, y: number): { x: number; y: number } {
  const snap = (value: number) => Math.round(value / 10) * 10;
  return {
    x: Math.min(376, Math.max(40, snap(x))),
    y: Math.min(280, Math.max(80, snap(y))),
  };
}

export function snapStashCoord(x: number): number {
  const snap = (value: number) => Math.round(value / 10) * 10;
  return Math.min(360, Math.max(80, snap(x)));
}

export function findHoleNear(
  draft: EditorDraft,
  x: number,
  y: number,
  radius = 22,
  exceptId?: string,
): HoleDef | undefined {
  let best: HoleDef | undefined;
  let bestDist = radius * radius;

  for (const hole of draft.holes) {
    if (exceptId && hole.id === exceptId) continue;
    const dx = hole.x - x;
    const dy = hole.y - y;
    const dist = dx * dx + dy * dy;
    if (dist <= bestDist) {
      bestDist = dist;
      best = hole;
    }
  }

  return best;
}

/** Best hole to grab when dragging — stash row uses a wide horizontal target. */
export function findHoleAtPointer(draft: EditorDraft, x: number, y: number): HoleDef | undefined {
  const direct = findHoleNear(draft, x, y, 28);
  if (direct) return direct;

  if (Math.abs(y - STASH_HOLE_Y) <= 40) {
    let best: HoleDef | undefined;
    let bestDx = 44;
    for (const hole of draft.holes) {
      if (hole.kind !== 'stash') continue;
      const dx = Math.abs(hole.x - x);
      if (dx < bestDx) {
        bestDx = dx;
        best = hole;
      }
    }
    if (best) return best;
  }

  return findHoleNear(draft, x, y, 22);
}

export function moveBoardHole(draft: EditorDraft, holeId: string, x: number, y: number): boolean {
  const hole = draft.holes.find((h) => h.id === holeId);
  if (!hole || hole.kind !== 'board') return false;

  const pos = snapBoardCoord(x, y);
  if (findHoleNear(draft, pos.x, pos.y, 18, holeId)) return false;

  hole.x = pos.x;
  hole.y = pos.y;
  return true;
}

export function moveStashHole(draft: EditorDraft, holeId: string, x: number): boolean {
  const hole = draft.holes.find((h) => h.id === holeId);
  if (!hole || hole.kind !== 'stash') return false;

  const posX = snapStashCoord(x);
  if (findHoleNear(draft, posX, STASH_HOLE_Y, 18, holeId)) return false;

  hole.x = posX;
  return true;
}

/** Shift every board anchor on the plate by the same delta (moves the bar as a unit). */
export function movePlateByDelta(
  draft: EditorDraft,
  plateId: string,
  dx: number,
  dy: number,
): boolean {
  const plate = draft.plates.find((p) => p.id === plateId);
  if (!plate || plate.anchors.length === 0) return false;

  const positions = plate.anchors.map((holeId) => {
    const hole = draft.holes.find((h) => h.id === holeId);
    if (!hole || hole.kind !== 'board') return null;
    return snapBoardCoord(hole.x + dx, hole.y + dy);
  });

  if (positions.some((pos) => pos === null)) return false;

  for (let i = 0; i < plate.anchors.length; i++) {
    const holeId = plate.anchors[i];
    const pos = positions[i]!;
    if (findHoleNear(draft, pos.x, pos.y, 18, holeId)) return false;
  }

  for (let i = 0; i < plate.anchors.length; i++) {
    const hole = draft.holes.find((h) => h.id === plate.anchors[i]);
    const pos = positions[i]!;
    if (hole && hole.kind === 'board') {
      hole.x = pos.x;
      hole.y = pos.y;
    }
  }

  return true;
}

export function addBoardHole(draft: EditorDraft, x: number, y: number): void {
  const pos = snapBoardCoord(x, y);
  if (findHoleNear(draft, pos.x, pos.y, 16)) return;

  const id = nextId(
    'h',
    draft.holes.map((hole) => hole.id),
  );
  draft.holes.push({ id, x: pos.x, y: pos.y, kind: 'board' });
}

export function addStashHole(draft: EditorDraft, x: number): void {
  const posX = snapStashCoord(x);
  if (findHoleNear(draft, posX, STASH_HOLE_Y, 16)) return;

  const id = nextId(
    's',
    draft.holes.map((hole) => hole.id),
  );
  draft.holes.push({ id, x: posX, y: STASH_HOLE_Y, kind: 'stash' });
}

export function toggleScrew(draft: EditorDraft, holeId: string): void {
  const hole = draft.holes.find((h) => h.id === holeId);
  if (!hole || hole.kind !== 'board') return;

  if (draft.screws[holeId]) {
    delete draft.screws[holeId];
    return;
  }

  const screwId = nextId('bolt-', Object.values(draft.screws));
  draft.screws[holeId] = screwId;
}

export function addPlate(draft: EditorDraft): string {
  const id = nextId(
    'p',
    draft.plates.map((plate) => plate.id),
  );
  draft.plates.push({
    id,
    layer: 0,
    anchors: [],
    width: 120,
    height: 36,
  });
  return id;
}

export function togglePlateAnchor(
  draft: EditorDraft,
  plateId: string,
  holeId: string,
): void {
  const plate = draft.plates.find((p) => p.id === plateId);
  const hole = draft.holes.find((h) => h.id === holeId);
  if (!plate || !hole || hole.kind !== 'board') return;

  const index = plate.anchors.indexOf(holeId);
  if (index >= 0) {
    plate.anchors.splice(index, 1);
  } else {
    plate.anchors.push(holeId);
  }
}

export function setPlateLayer(draft: EditorDraft, plateId: string, layer: number): void {
  const plate = draft.plates.find((p) => p.id === plateId);
  if (!plate) return;
  plate.layer = Math.max(0, Math.floor(layer));
}

export function removeHole(draft: EditorDraft, holeId: string): void {
  draft.holes = draft.holes.filter((hole) => hole.id !== holeId);
  delete draft.screws[holeId];
  for (const plate of draft.plates) {
    plate.anchors = plate.anchors.filter((anchor) => anchor !== holeId);
  }
}

export function applyTool(
  draft: EditorDraft,
  tool: EditorTool,
  x: number,
  y: number,
  activePlateId: string | null,
): void {
  const near = findHoleNear(draft, x, y);

  switch (tool) {
    case 'board-hole':
      addBoardHole(draft, x, y);
      break;
    case 'stash-hole':
      addStashHole(draft, x);
      break;
    case 'screw':
      if (near) toggleScrew(draft, near.id);
      break;
    case 'plate-anchor':
      if (near && activePlateId) togglePlateAnchor(draft, activePlateId, near.id);
      break;
    case 'move':
      break;
    case 'erase':
      if (near) removeHole(draft, near.id);
      break;
  }
}
