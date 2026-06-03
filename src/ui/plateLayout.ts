import type { HoleState, PlateState } from '../core/types';

const SCREW_PAD = 24;
const GRAVITY_DEG = 90;

export type PlateLayoutMode = 'rigid' | 'hang' | 'lone';

export type PlateLayout = {
  mode: PlateLayoutMode;
  width: number;
  height: number;
  /** Full SVG transform for the plate group (rect centered at local origin). */
  transform: string;
  /** Rigid angle before hang (for tilt animation). */
  rigidAngle: number;
  hangAngle: number;
};

export function screwsOnPlate(plate: PlateState, holes: HoleState[]): number {
  return plate.anchors.reduce((count, holeId) => {
    const hole = holes.find((h) => h.id === holeId);
    return count + (hole?.screwId ? 1 : 0);
  }, 0);
}

/** True when another active plate still shares a screwed anchor (same physical pin). */
export function plateHasSharedOccupiedAnchor(
  plate: PlateState,
  holes: HoleState[],
  plates: PlateState[],
): boolean {
  for (const holeId of plate.anchors) {
    const hole = holes.find((h) => h.id === holeId);
    if (!hole?.screwId) continue;

    const shares = plates.some(
      (other) =>
        !other.removed && other.id !== plate.id && other.anchors.includes(holeId),
    );
    if (shares) return true;
  }
  return false;
}

export function canPlateHang(
  plate: PlateState,
  holes: HoleState[],
  plates: PlateState[],
): boolean {
  if (plate.removed || plate.anchors.length < 2) return false;
  if (screwsOnPlate(plate, holes) !== 1) return false;
  return !plateHasSharedOccupiedAnchor(plate, holes, plates);
}

function anchorHolesForPlate(plate: PlateState, holes: HoleState[]): HoleState[] {
  return plate.anchors
    .map((id) => holes.find((hole) => hole.id === id))
    .filter((hole): hole is HoleState => hole !== undefined);
}

function emptyAnchorHoles(plate: PlateState, holes: HoleState[]): HoleState[] {
  return anchorHolesForPlate(plate, holes).filter((hole) => !hole.screwId);
}

function centroid(points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return { x, y };
}

function rigidAngleFromAnchors(ordered: HoleState[]): number {
  if (ordered.length < 2) return 0;
  const [first, second] = ordered;
  return (Math.atan2(second.y - first.y, second.x - first.x) * 180) / Math.PI;
}

/**
 * Bar length runs along local X (anchor line); thickness is local Y.
 * Uses oriented spans — not axis-aligned bbox (which bloated vertical bars).
 */
function spanSize(
  anchorHoles: HoleState[],
  plate: PlateState,
  rigidAngleDeg: number,
): { width: number; height: number } {
  if (anchorHoles.length === 0) {
    return { width: plate.width, height: plate.height };
  }

  if (anchorHoles.length === 1) {
    return { width: Math.max(plate.width, 60), height: plate.height };
  }

  const center = centroid(anchorHoles);
  const rad = (-rigidAngleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let minAlong = Infinity;
  let maxAlong = -Infinity;
  let minPerp = Infinity;
  let maxPerp = -Infinity;

  for (const hole of anchorHoles) {
    const dx = hole.x - center.x;
    const dy = hole.y - center.y;
    const along = dx * cos - dy * sin;
    const perp = dx * sin + dy * cos;
    minAlong = Math.min(minAlong, along);
    maxAlong = Math.max(maxAlong, along);
    minPerp = Math.min(minPerp, perp);
    maxPerp = Math.max(maxPerp, perp);
  }

  const alongSpan = maxAlong - minAlong;
  const perpSpan = maxPerp - minPerp;
  const thickness =
    perpSpan < 2
      ? plate.height
      : Math.max(plate.height, perpSpan + SCREW_PAD * 2);

  return {
    width: Math.max(plate.width, alongSpan + SCREW_PAD * 2),
    height: thickness,
  };
}

function pivotToCenterOffset(
  pivot: HoleState,
  center: { x: number; y: number },
  rigidAngleDeg: number,
): { x: number; y: number } {
  const dx = center.x - pivot.x;
  const dy = center.y - pivot.y;
  const rad = (-rigidAngleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

function hangAngleDeg(pivot: HoleState, emptyCentroid: { x: number; y: number }): number {
  const leanDeg =
    (Math.atan2(emptyCentroid.y - pivot.y, emptyCentroid.x - pivot.x) * 180) / Math.PI;
  return GRAVITY_DEG - leanDeg;
}

function plateTransform(
  pivot: { x: number; y: number },
  angleDeg: number,
  offset: { x: number; y: number },
  rigidAngleDeg = 0,
): string {
  return `translate(${pivot.x} ${pivot.y}) rotate(${angleDeg}) translate(${offset.x} ${offset.y}) rotate(${rigidAngleDeg})`;
}

/** Size and pose so anchor holes sit on the metal; hangs when one screw remains on a multi-anchor plate. */
export function plateLayout(plate: PlateState, holes: HoleState[], plates: PlateState[]): PlateLayout {
  const anchorHoles = anchorHolesForPlate(plate, holes);
  const hang = canPlateHang(plate, holes, plates);

  if (anchorHoles.length === 0) {
    const rigidAngle = 0;
    return {
      mode: 'lone',
      width: plate.width,
      height: plate.height,
      rigidAngle,
      hangAngle: rigidAngle,
      transform: plateTransform({ x: 200, y: 180 }, rigidAngle, { x: 0, y: 0 }),
    };
  }

  const ordered = plate.anchors
    .map((id) => anchorHoles.find((hole) => hole.id === id))
    .filter((hole): hole is HoleState => hole !== undefined);
  const rigidAngle = rigidAngleFromAnchors(ordered);
  const center = centroid(anchorHoles);
  const { width, height } = spanSize(anchorHoles, plate, rigidAngle);

  if (anchorHoles.length === 1) {
    const [only] = anchorHoles;
    const offset = pivotToCenterOffset(only, center, 0);
    return {
      mode: 'lone',
      width,
      height,
      rigidAngle: 0,
      hangAngle: 0,
      transform: plateTransform(only, 0, offset),
    };
  }

  if (!hang) {
    return {
      mode: 'rigid',
      width,
      height,
      rigidAngle,
      hangAngle: rigidAngle,
      transform: plateTransform(center, rigidAngle, { x: 0, y: 0 }),
    };
  }

  const pivot = anchorHoles.find((hole) => hole.screwId)!;
  const emptyCentroid = centroid(emptyAnchorHoles(plate, holes));
  const hangAngle = hangAngleDeg(pivot, emptyCentroid);
  const offset = pivotToCenterOffset(pivot, center, rigidAngle);

  return {
    mode: 'hang',
    width,
    height,
    rigidAngle,
    hangAngle,
    transform: plateTransform(pivot, hangAngle, offset, rigidAngle),
  };
}

export function plateLayoutRigidTransform(plate: PlateState, holes: HoleState[]): string {
  const anchorHoles = anchorHolesForPlate(plate, holes);
  if (anchorHoles.length === 0) {
    return plateTransform({ x: 200, y: 180 }, 0, { x: 0, y: 0 });
  }

  const ordered = plate.anchors
    .map((id) => anchorHoles.find((hole) => hole.id === id))
    .filter((hole): hole is HoleState => hole !== undefined);
  const rigidAngle = rigidAngleFromAnchors(ordered);
  const center = centroid(anchorHoles);
  const offset = { x: 0, y: 0 };

  if (anchorHoles.length === 1) {
    const [only] = anchorHoles;
    return plateTransform(only, 0, pivotToCenterOffset(only, center, 0));
  }

  return plateTransform(center, rigidAngle, offset);
}
