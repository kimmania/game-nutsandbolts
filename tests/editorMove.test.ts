import { describe, expect, it } from 'vitest';
import {
  addBoardHole,
  addPlate,
  createEmptyDraft,
  moveBoardHole,
  movePlateByDelta,
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
