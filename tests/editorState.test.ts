import { describe, expect, it } from 'vitest';
import { isLevelSolvable } from '../src/core/solver';
import { validateLevel } from '../src/core/validateLevel';
import {
  addBoardHole,
  addPlate,
  addStashHole,
  applyTool,
  createEmptyDraft,
  togglePlateAnchor,
  toggleScrew,
  toLevelDef,
} from '../src/editor/editorState';

describe('editorState', () => {
  it('builds a minimal solvable two-bar level', () => {
    const draft = createEmptyDraft();
    addBoardHole(draft, 100, 160);
    addBoardHole(draft, 260, 160);
    addStashHole(draft, 120);
    addStashHole(draft, 240);

    const top = addPlate(draft);
    const h1 = draft.holes.find((h) => h.x === 100)!;
    const h2 = draft.holes.find((h) => h.x === 260)!;
    togglePlateAnchor(draft, top, h1.id);
    togglePlateAnchor(draft, top, h2.id);
    toggleScrew(draft, h1.id);
    toggleScrew(draft, h2.id);

    const level = toLevelDef(draft);
    validateLevel(level);
    expect(isLevelSolvable(level)).toBe(true);
    expect(level.plates).toHaveLength(1);
    expect(level.holes.filter((h) => h.kind === 'stash')).toHaveLength(2);
  });

  it('toggles plate anchors via applyTool', () => {
    const draft = createEmptyDraft();
    addBoardHole(draft, 200, 200);
    const plateId = addPlate(draft);
    const hole = draft.holes[0];

    applyTool(draft, 'plate-anchor', hole.x, hole.y, plateId);
    expect(draft.plates[0].anchors).toContain(hole.id);

    applyTool(draft, 'plate-anchor', hole.x, hole.y, plateId);
    expect(draft.plates[0].anchors).not.toContain(hole.id);
  });
});
