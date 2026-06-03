import { STASH_HOLE_Y, VIEW_HEIGHT, VIEW_WIDTH } from '../ui/viewLayout';
import type { LevelDef } from './types';

export function validateLevel(level: LevelDef, expectedId?: number): void {
  if (expectedId !== undefined && level.id !== expectedId) {
    throw new Error(`Level id mismatch: expected ${expectedId}, got ${level.id}`);
  }
  if (!level.name || level.holes.length === 0) {
    throw new Error(`Level ${level.id} is invalid`);
  }

  const holeIds = new Set(level.holes.map((hole) => hole.id));
  if (holeIds.size !== level.holes.length) {
    throw new Error(`Level ${level.id} has duplicate hole ids`);
  }

  for (const plate of level.plates) {
    for (const anchor of plate.anchors) {
      if (!holeIds.has(anchor)) {
        throw new Error(`Level ${level.id}: plate ${plate.id} references unknown hole ${anchor}`);
      }
    }
  }

  for (const holeId of Object.keys(level.screws)) {
    if (!holeIds.has(holeId)) {
      throw new Error(`Level ${level.id}: screw on unknown hole ${holeId}`);
    }
  }

  for (const hole of level.holes) {
    if (hole.x < 0 || hole.x > VIEW_WIDTH || hole.y < 0 || hole.y > VIEW_HEIGHT) {
      throw new Error(`Level ${level.id}: hole ${hole.id} is outside the view box`);
    }
    if (hole.kind === 'stash' && Math.abs(hole.y - STASH_HOLE_Y) > 12) {
      throw new Error(
        `Level ${level.id}: stash hole ${hole.id} should use y=${STASH_HOLE_Y} (got ${hole.y})`,
      );
    }
  }
}
