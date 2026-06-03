import { describe, expect, it, vi } from 'vitest';
import { prepareLevelExport } from '../src/editor/editorExport';
import {
  clearEditorDraft,
  loadEditorDraft,
  saveEditorDraft,
} from '../src/editor/editorStorage';
import {
  addBoardHole,
  addPlate,
  addStashHole,
  createEmptyDraft,
  togglePlateAnchor,
  toggleScrew,
} from '../src/editor/editorState';

describe('editor save', () => {
  it('prepareLevelExport rejects unsolvable drafts', () => {
    const draft = createEmptyDraft();
    addBoardHole(draft, 100, 160);
    addBoardHole(draft, 200, 160);
    addBoardHole(draft, 300, 160);
    addStashHole(draft, 200);
    const plateId = addPlate(draft);
    for (const hole of draft.holes.filter((h) => h.kind === 'board')) {
      togglePlateAnchor(draft, plateId, hole.id);
      toggleScrew(draft, hole.id);
    }

    const result = prepareLevelExport(draft);
    expect(result.ok).toBe(false);
  });

  it('round-trips draft through localStorage', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });

    const draft = createEmptyDraft();
    draft.name = 'Saved test';
    addBoardHole(draft, 120, 180);
    saveEditorDraft(draft);

    expect(loadEditorDraft()?.name).toBe('Saved test');
    expect(loadEditorDraft()?.holes).toHaveLength(1);

    clearEditorDraft();
    expect(loadEditorDraft()).toBeNull();

    vi.unstubAllGlobals();
  });
});
