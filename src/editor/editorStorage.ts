import type { EditorDraft } from './editorState';
import { createEmptyDraft } from './editorState';

const DRAFT_KEY = 'nutsandbolts-editor-draft';

export function saveEditorDraft(draft: EditorDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota or private mode */
  }
}

export function loadEditorDraft(): EditorDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorDraft;
    if (
      typeof parsed.id !== 'number' ||
      typeof parsed.name !== 'string' ||
      !Array.isArray(parsed.holes) ||
      !Array.isArray(parsed.plates) ||
      typeof parsed.screws !== 'object'
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      holes: parsed.holes,
      plates: parsed.plates.map((plate) => ({ ...plate, anchors: [...plate.anchors] })),
      screws: { ...parsed.screws },
    };
  } catch {
    return null;
  }
}

export function clearEditorDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function loadDraftOrEmpty(): EditorDraft {
  return loadEditorDraft() ?? createEmptyDraft();
}
