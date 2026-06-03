import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/core/board';
import { validateLevel } from '../src/core/levels';
import type { LevelDef } from '../src/core/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'levels');

function loadLevel(id: number): LevelDef {
  const raw = readFileSync(join(root, `${id}.json`), 'utf8');
  return JSON.parse(raw) as LevelDef;
}

describe('level files', () => {
  const ids = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')) as number[];

  it('index lists valid levels', () => {
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const level = loadLevel(id);
      validateLevel(level, id);
      const state = createGameState(level);
      expect(state.status).toBe('playing');
    }
  });
});
