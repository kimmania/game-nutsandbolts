import { fetchLevel } from '../core/levels';
import { gameBaseUrl } from './editMode';
import { downloadLevelJson, prepareLevelExport } from './editorExport';
import {
  createEditorBoard,
  renderEditorBoard,
  targetAtPoint,
  type EditorPointerTarget,
} from './editorBoard';
import {
  clearEditorDraft,
  loadEditorDraft,
  saveEditorDraft,
} from './editorStorage';
import {
  addPlate,
  applyTool,
  createEmptyDraft,
  draftFromLevel,
  moveBoardHole,
  movePlateByDelta,
  moveStashHole,
  setPlateLayer,
  type EditorDraft,
  type EditorTool,
} from './editorState';

const TOOL_HINTS: Record<EditorTool, string> = {
  'board-hole': 'Tap the wood panel to add a board hole.',
  'stash-hole': 'Tap near the spare-hole row to add a stash slot.',
  screw: 'Tap a board hole to toggle a starting screw.',
  'plate-anchor': 'Tap board holes to add or remove anchors on the selected plate.',
  move: 'Drag a hole to reposition it. Drag a plate bar to move all its anchors together. Tap a plate to select it.',
  erase: 'Tap a hole to remove it.',
};

type DragState =
  | { kind: 'hole'; holeId: string; startX: number; startY: number; originX: number; originY: number }
  | { kind: 'plate'; plateId: string; startX: number; startY: number }
  | { kind: 'stash'; holeId: string; startX: number; originX: number };

async function loadInitialDraft(): Promise<EditorDraft> {
  const levelParam = new URLSearchParams(window.location.search).get('level');
  if (levelParam) {
    const levelId = Number(levelParam);
    if (Number.isFinite(levelId) && levelId >= 1) {
      try {
        return draftFromLevel(await fetchLevel(levelId));
      } catch {
        /* fall through to draft restore */
      }
    }
  }

  const saved = loadEditorDraft();
  if (saved) {
    const restore = window.confirm('Restore your last saved editor draft?');
    if (restore) return saved;
  }

  return createEmptyDraft();
}

export async function bootstrapEditor(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const draft = await loadInitialDraft();
  let tool: EditorTool = 'board-hole';
  let activePlateId: string | null = draft.plates[0]?.id ?? null;
  let drag: DragState | null = null;

  app.innerHTML = '';
  app.className = 'editor-app';

  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <div>
      <h1 class="title">Level editor</h1>
      <a class="level-meta-btn" href="${gameBaseUrl()}">← Back to game</a>
    </div>
  `;

  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Editor tools');

  const tools: { id: EditorTool; label: string }[] = [
    { id: 'board-hole', label: 'Board hole' },
    { id: 'stash-hole', label: 'Stash' },
    { id: 'screw', label: 'Screw' },
    { id: 'plate-anchor', label: 'Anchor' },
    { id: 'move', label: 'Move' },
    { id: 'erase', label: 'Erase' },
  ];

  const toolButtons = new Map<EditorTool, HTMLButtonElement>();

  for (const entry of tools) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn editor-tool-btn';
    btn.textContent = entry.label;
    btn.dataset.tool = entry.id;
    btn.addEventListener('click', () => selectTool(entry.id));
    toolButtons.set(entry.id, btn);
    toolbar.appendChild(btn);
  }

  const plateBar = document.createElement('div');
  plateBar.className = 'editor-plate-bar';

  const plateSelect = document.createElement('select');
  plateSelect.className = 'editor-plate-select';
  plateSelect.setAttribute('aria-label', 'Active plate');

  const layerInput = document.createElement('input');
  layerInput.type = 'number';
  layerInput.min = '0';
  layerInput.step = '1';
  layerInput.className = 'editor-layer-input';
  layerInput.setAttribute('aria-label', 'Plate layer');

  const newPlateBtn = document.createElement('button');
  newPlateBtn.type = 'button';
  newPlateBtn.className = 'btn';
  newPlateBtn.textContent = 'New plate';
  newPlateBtn.addEventListener('click', () => {
    activePlateId = addPlate(draft);
    selectTool('plate-anchor');
    refreshPlateControls();
    render();
  });

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn';
  clearBtn.textContent = 'Clear all';
  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear the entire draft?')) return;
    draft.holes = [];
    draft.plates = [];
    draft.screws = {};
    activePlateId = null;
    refreshPlateControls();
    render();
  });

  plateBar.append(plateSelect, layerInput, newPlateBtn, clearBtn);

  const hint = document.createElement('p');
  hint.className = 'hint editor-hint';

  const boardHost = document.createElement('main');
  boardHost.className = 'game-area';
  const boardInner = document.createElement('div');
  boardInner.className = 'board-host';
  boardHost.appendChild(boardInner);

  const exportPanel = document.createElement('section');
  exportPanel.className = 'editor-export';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'editor-field';
  nameInput.placeholder = 'Level name';
  nameInput.value = draft.name;

  const idInput = document.createElement('input');
  idInput.type = 'number';
  idInput.min = '1';
  idInput.className = 'editor-field';
  idInput.value = String(draft.id);

  const statusEl = document.createElement('p');
  statusEl.className = 'editor-status';
  statusEl.setAttribute('role', 'status');

  const exportActions = document.createElement('div');
  exportActions.className = 'editor-export-actions';

  const saveDraftBtn = document.createElement('button');
  saveDraftBtn.type = 'button';
  saveDraftBtn.className = 'btn';
  saveDraftBtn.textContent = 'Save draft';

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.className = 'btn btn-primary';
  downloadBtn.textContent = 'Download .json';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn';
  copyBtn.textContent = 'Copy JSON';

  const clearDraftBtn = document.createElement('button');
  clearDraftBtn.type = 'button';
  clearDraftBtn.className = 'btn';
  clearDraftBtn.textContent = 'Clear draft';

  exportActions.append(saveDraftBtn, downloadBtn, copyBtn, clearDraftBtn);

  const jsonPreview = document.createElement('textarea');
  jsonPreview.className = 'editor-json';
  jsonPreview.readOnly = true;
  jsonPreview.rows = 6;
  jsonPreview.placeholder = 'Validated JSON appears here…';

  const shipHint = document.createElement('p');
  shipHint.className = 'editor-ship-hint';
  shipHint.textContent =
    'To ship: put the file in public/levels/, add the id to index.json, run npm run validate-levels.';

  saveDraftBtn.addEventListener('click', () => handleSaveDraft());
  downloadBtn.addEventListener('click', () => handleDownload());
  copyBtn.addEventListener('click', () => void handleCopy());
  clearDraftBtn.addEventListener('click', () => handleClearDraft());

  exportPanel.append(nameInput, idInput, exportActions, statusEl, jsonPreview, shipHint);

  app.append(header, toolbar, plateBar, hint, boardHost, exportPanel);

  function selectPlate(plateId: string | null): void {
    activePlateId = plateId;
    refreshPlateControls();
    render();
  }

  function handlePointer(x: number, y: number, target: EditorPointerTarget): void {
    if (tool === 'move') {
      if (target.kind === 'hole') {
        const hole = draft.holes.find((h) => h.id === target.holeId);
        if (!hole) return;
        if (hole.kind === 'stash') {
          drag = { kind: 'stash', holeId: hole.id, startX: x, originX: hole.x };
        } else {
          drag = {
            kind: 'hole',
            holeId: hole.id,
            startX: x,
            startY: y,
            originX: hole.x,
            originY: hole.y,
          };
        }
        return;
      }

      if (target.kind === 'plate') {
        const plate = draft.plates.find((p) => p.id === target.plateId);
        if (!plate || plate.anchors.length === 0) {
          hint.textContent = 'Add anchors to this plate before moving it.';
          return;
        }
        selectPlate(target.plateId);
        drag = { kind: 'plate', plateId: target.plateId, startX: x, startY: y };
        return;
      }

      return;
    }

    if (target.kind === 'plate') {
      selectPlate(target.plateId);
      if (tool !== 'plate-anchor') selectTool('plate-anchor');
      return;
    }

    if (target.kind === 'hole' && (tool === 'screw' || tool === 'plate-anchor' || tool === 'erase')) {
      applyTool(draft, tool, x, y, activePlateId);
      render();
      return;
    }

    const resolved = target.kind === 'canvas' ? targetAtPoint(draft, x, y) : target;
    if (resolved.kind === 'hole' && tool !== 'board-hole' && tool !== 'stash-hole') {
      applyTool(draft, tool, x, y, activePlateId);
      render();
      return;
    }

    applyTool(draft, tool, x, y, activePlateId);
    render();
  }

  function handleDragMove(x: number, y: number): void {
    if (!drag) return;

    if (drag.kind === 'hole') {
      moveBoardHole(draft, drag.holeId, drag.originX + (x - drag.startX), drag.originY + (y - drag.startY));
      render();
      return;
    }

    if (drag.kind === 'stash') {
      moveStashHole(draft, drag.holeId, drag.originX + (x - drag.startX));
      render();
      return;
    }

    if (drag.kind === 'plate') {
      if (movePlateByDelta(draft, drag.plateId, x - drag.startX, y - drag.startY)) {
        drag = { ...drag, startX: x, startY: y };
        render();
      }
    }
  }

  function handleDragEnd(): void {
    drag = null;
  }

  const board = createEditorBoard(boardInner, {
    onCanvasPointer: handlePointer,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
  });

  function selectTool(next: EditorTool): void {
    tool = next;
    for (const [id, btn] of toolButtons) {
      btn.classList.toggle('editor-tool-active', id === tool);
    }
    hint.textContent = TOOL_HINTS[tool];
    if (tool === 'plate-anchor' && !activePlateId) {
      hint.textContent += ' Create or select a plate first.';
    }
    boardInner.classList.toggle('editor-canvas-move', tool === 'move');
  }

  function refreshPlateControls(): void {
    const selected = activePlateId;
    plateSelect.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'No plate';
    plateSelect.appendChild(empty);

    for (const plate of draft.plates) {
      const option = document.createElement('option');
      option.value = plate.id;
      const anchorCount = plate.anchors.length;
      option.textContent = `${plate.id} (L${plate.layer}, ${anchorCount} anchor${anchorCount === 1 ? '' : 's'})`;
      plateSelect.appendChild(option);
    }

    plateSelect.value = selected ?? '';
    const plate = draft.plates.find((p) => p.id === selected);
    layerInput.value = String(plate?.layer ?? 0);
    layerInput.disabled = !plate;
  }

  plateSelect.addEventListener('change', () => {
    selectPlate(plateSelect.value || null);
  });

  layerInput.addEventListener('change', () => {
    if (!activePlateId) return;
    setPlateLayer(draft, activePlateId, Number(layerInput.value));
    refreshPlateControls();
    render();
  });

  nameInput.addEventListener('input', () => {
    draft.name = nameInput.value.trim() || 'New level';
  });

  idInput.addEventListener('change', () => {
    draft.id = Math.max(1, Math.floor(Number(idInput.value)) || 1);
  });

  function syncDraftMeta(): void {
    draft.name = nameInput.value.trim() || 'New level';
    draft.id = Math.max(1, Math.floor(Number(idInput.value)) || 1);
    nameInput.value = draft.name;
    idInput.value = String(draft.id);
  }

  function render(): void {
    syncDraftMeta();
    renderEditorBoard(board, draft, activePlateId);
    refreshPlateControls();
    saveEditorDraft(draft);
  }

  function handleSaveDraft(): void {
    syncDraftMeta();
    saveEditorDraft(draft);
    statusEl.textContent = 'Draft saved in this browser. It restores next time you open the editor.';
  }

  function handleDownload(): void {
    syncDraftMeta();
    const result = prepareLevelExport(draft);
    if (!result.ok) {
      statusEl.textContent = result.message;
      jsonPreview.value = '';
      return;
    }

    jsonPreview.value = result.json;
    saveEditorDraft(draft);
    downloadLevelJson(result.level, result.json);
    statusEl.textContent = `Downloaded ${result.level.id}.json (solvable, ${result.statesExplored} states). Add the id to public/levels/index.json.`;
  }

  async function handleCopy(): Promise<void> {
    syncDraftMeta();
    const result = prepareLevelExport(draft);
    if (!result.ok) {
      statusEl.textContent = result.message;
      jsonPreview.value = '';
      return;
    }

    jsonPreview.value = result.json;
    saveEditorDraft(draft);

    try {
      await navigator.clipboard.writeText(result.json);
      statusEl.textContent = `JSON copied (${result.statesExplored} states explored).`;
    } catch {
      statusEl.textContent = `Solvable (${result.statesExplored} states). Copy from the box below.`;
    }
  }

  function handleClearDraft(): void {
    if (!window.confirm('Clear the saved editor draft? The canvas is unchanged until you reload.')) {
      return;
    }
    clearEditorDraft();
    statusEl.textContent = 'Saved draft cleared from this browser.';
  }

  nameInput.value = draft.name;
  idInput.value = String(draft.id);

  selectTool('board-hole');
  if (draft.plates.length === 0) {
    activePlateId = addPlate(draft);
  }
  refreshPlateControls();
  render();
}
