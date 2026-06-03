import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../src/core/levels';
import type { LevelDef } from '../src/core/types';

const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'levels');

/** Structural signature (ignores coordinates and names). */
export function levelFingerprint(level: LevelDef): string {
  const stash = level.holes.filter((h) => h.kind === 'stash').length;
  const plates = level.plates
    .map((p) => `${p.layer}:${[...p.anchors].sort().join('+')}`)
    .sort()
    .join('|');
  return `${stash}|${plates}`;
}

function loadAllLevels(): LevelDef[] {
  const index = JSON.parse(
    readFileSync(join(levelsDir, 'index.json'), 'utf8'),
  ) as number[];

  return index.map((id) => {
    const level = JSON.parse(
      readFileSync(join(levelsDir, `${id}.json`), 'utf8'),
    ) as LevelDef;
    validateLevel(level, id);
    return level;
  });
}

describe('level variety', () => {
  const levels = loadAllLevels();

  it('has no duplicate structural layouts', () => {
    const seen = new Map<string, number[]>();
    for (const level of levels) {
      const key = levelFingerprint(level);
      const ids = seen.get(key) ?? [];
      ids.push(level.id);
      seen.set(key, ids);
    }

    const duplicates = [...seen.entries()].filter(([, ids]) => ids.length > 1);
    expect(duplicates).toEqual([]);
  });

  it('index matches level files on disk', () => {
    const indexed = JSON.parse(
      readFileSync(join(levelsDir, 'index.json'), 'utf8'),
    ) as number[];
    const files = readdirSync(levelsDir)
      .filter((f) => f.endsWith('.json') && f !== 'index.json')
      .map((f) => Number(f.replace('.json', '')))
      .sort((a, b) => a - b);
    expect(indexed).toEqual(files);
  });
});
