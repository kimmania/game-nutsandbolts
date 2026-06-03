import { describe, expect, it } from 'vitest';
import {
  addBoardHole,
  addPlate,
  addStashHole,
  createEmptyDraft,
  findHoleAtPointer,
  moveBoardHole,
  movePlateByDelta,
  moveStashHole,
  togglePlateAnchor,
} from '../src/editor/editorState';

describe('editor move', () => {
  it('moves a single board hole', () => {
    const draft = createEmptyDraft();
    addBoardHole(draft, 100, 160);
    const hole = draft.holes[0];
    expect(moveBoardHole(draft, hole.id, 200, 180)).toBe(true);
    expect(hole.x).toBe(200);
    expect(hole.y).toBe(180);
  });

  it('moves a stash hole along the spare row', () => {
    const draft = createEmptyDraft();
    addStashHole(draft, 120);
    const hole = draft.holes.find((h) => h.kind === 'stash')!;
    expect(moveStashHole(draft, hole.id, 240)).toBe(true);
    expect(hole.x).toBe(240);
  });

  it('finds stash holes when tapping near the spare row', () => {
    const draft = createEmptyDraft();
    addStashHole(draft, 200);
    const found = findHoleAtPointer(draft, 205, 470);
    expect(found?.id).toBe(draft.holes[0].id);
  });

  it('moves all anchors when dragging a plate', () => {
    const draft = createEmptyDraft();
    addBoardHole(draft, 100, 160);
    addBoardHole(draft, 260, 160);
    const plateId = addPlate(draft);
    togglePlateAnchor(draft, plateId, draft.holes[0].id);
    togglePlateAnchor(draft, plateId, draft.holes[1].id);

    expect(movePlateByDelta(draft, plateId, 20, 10)).toBe(true);
    expect(draft.holes[0].x).toBe(120);
    expect(draft.holes[0].y).toBe(170);
    expect(draft.holes[1].x).toBe(280);
    expect(draft.holes[1].y).toBe(170);
  });
});
