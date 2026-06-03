import type { LevelDef } from './types';

const BASE = import.meta.env.BASE_URL;

export async function fetchLevel(levelId: number): Promise<LevelDef> {
  const response = await fetch(`${BASE}levels/${levelId}.json`);
  if (!response.ok) {
    throw new Error(`Level ${levelId} not found (${response.status})`);
  }
  const data = (await response.json()) as LevelDef;
  validateLevel(data, levelId);
  return data;
}

export async function fetchLevelIndex(): Promise<number[]> {
  const response = await fetch(`${BASE}levels/index.json`);
  if (!response.ok) {
    throw new Error(`Level index not found (${response.status})`);
  }
  const ids = (await response.json()) as number[];
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Level index is empty');
  }
  return ids;
}

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
}
