import { createGameState } from '../core/board';
import type { EditorDraft } from './editorState';
import { findHoleAtPointer, toLevelDef } from './editorState';
import { plateLayout } from '../ui/plateLayout';
import {
  BOARD_WOOD,
  FLOATING_SCREW_X,
  STASH_HOLE_Y,
  STASH_LABEL_Y,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../ui/viewLayout';

export type EditorBoard = {
  svg: SVGSVGElement;
  host: HTMLElement;
};

export type EditorPointerTarget =
  | { kind: 'hole'; holeId: string }
  | { kind: 'plate'; plateId: string }
  | { kind: 'canvas' };

export type EditorBoardHandlers = {
  onCanvasPointer: (x: number, y: number, target: EditorPointerTarget) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
};

export function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const local = point.matrixTransform(matrix.inverse());
  return { x: Math.round(local.x), y: Math.round(local.y) };
}

function pointerTargetFromElement(element: Element | null): EditorPointerTarget {
  const holeId = element?.closest('[data-hole-id]')?.getAttribute('data-hole-id');
  if (holeId) return { kind: 'hole', holeId };

  const plateId = element?.closest('[data-plate-id]')?.getAttribute('data-plate-id');
  if (plateId) return { kind: 'plate', plateId };

  return { kind: 'canvas' };
}

export function createEditorBoard(host: HTMLElement, handlers: EditorBoardHandlers): EditorBoard {
  host.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.setAttribute('class', 'puzzle-board editor-board');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Level editor canvas');

  const wood = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  wood.setAttribute('x', String(BOARD_WOOD.x));
  wood.setAttribute('y', String(BOARD_WOOD.y));
  wood.setAttribute('width', String(BOARD_WOOD.width));
  wood.setAttribute('height', String(BOARD_WOOD.height));
  wood.setAttribute('rx', '16');
  wood.setAttribute('class', 'board-wood');
  svg.appendChild(wood);

  const stashGuide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  stashGuide.setAttribute('x1', '40');
  stashGuide.setAttribute('x2', '360');
  stashGuide.setAttribute('y1', String(STASH_HOLE_Y));
  stashGuide.setAttribute('y2', String(STASH_HOLE_Y));
  stashGuide.setAttribute('class', 'editor-stash-guide');
  svg.appendChild(stashGuide);

  const stashLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  stashLabel.setAttribute('x', String(FLOATING_SCREW_X));
  stashLabel.setAttribute('y', String(STASH_LABEL_Y));
  stashLabel.setAttribute('text-anchor', 'middle');
  stashLabel.setAttribute('class', 'stash-label');
  stashLabel.textContent = 'Spare holes';
  svg.appendChild(stashLabel);

  const layers = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  layers.id = 'editor-layers';
  svg.appendChild(layers);

  host.appendChild(svg);

  let dragging = false;

  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = pointerTargetFromElement(event.target as Element);
    const point = clientToSvg(svg, event.clientX, event.clientY);
    dragging = true;
    svg.setPointerCapture(event.pointerId);
    handlers.onCanvasPointer(point.x, point.y, target);
    event.preventDefault();
  });

  svg.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const point = clientToSvg(svg, event.clientX, event.clientY);
    handlers.onDragMove(point.x, point.y);
  });

  const endDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
    handlers.onDragEnd();
  };

  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  return { svg, host };
}

export function renderEditorBoard(
  board: EditorBoard,
  draft: EditorDraft,
  activePlateId: string | null,
): void {
  const layers = board.svg.querySelector('#editor-layers');
  if (!layers) return;
  layers.replaceChildren();

  const level = toLevelDef(draft);
  const state = createGameState(level);

  const platesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  platesLayer.setAttribute('class', 'editor-plates-layer');
  for (const plate of state.plates) {
    const layout = plateLayout(plate, state.holes, state.plates);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'plate editor-plate');
    group.dataset.plateId = plate.id;
    if (plate.id === activePlateId) group.classList.add('editor-plate-active');
    group.setAttribute('transform', layout.transform);

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hit.setAttribute('x', String(-layout.width / 2));
    hit.setAttribute('y', String(-layout.height / 2));
    hit.setAttribute('width', String(layout.width));
    hit.setAttribute('height', String(layout.height));
    hit.setAttribute('rx', '8');
    hit.setAttribute('class', 'editor-plate-hit');
    group.appendChild(hit);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(-layout.width / 2));
    rect.setAttribute('y', String(-layout.height / 2));
    rect.setAttribute('width', String(layout.width));
    rect.setAttribute('height', String(layout.height));
    rect.setAttribute('rx', '8');
    rect.setAttribute('class', 'editor-plate-face');
    rect.setAttribute('pointer-events', 'none');
    group.appendChild(rect);

    platesLayer.appendChild(group);
  }
  layers.appendChild(platesLayer);

  const holesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  holesLayer.setAttribute('class', 'editor-holes-layer');
  for (const hole of draft.holes) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.holeId = hole.id;
    group.setAttribute('transform', `translate(${hole.x} ${hole.y})`);

    const activePlate = draft.plates.find((p) => p.id === activePlateId);
    const isAnchor = activePlate?.anchors.includes(hole.id) ?? false;
    const hasScrew = Boolean(draft.screws[hole.id]);

    group.setAttribute(
      'class',
      [
        'editor-hole',
        `editor-hole-${hole.kind}`,
        isAnchor ? 'editor-hole-anchor' : '',
        hasScrew ? 'editor-hole-screw' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hit.setAttribute('r', hole.kind === 'stash' ? '28' : '24');
    hit.setAttribute('class', 'editor-hole-hit');
    group.appendChild(hit);

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('r', '14');
    ring.setAttribute('class', 'editor-hole-ring');
    ring.setAttribute('pointer-events', 'none');
    group.appendChild(ring);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('y', '4');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'editor-hole-label');
    label.setAttribute('pointer-events', 'none');
    label.textContent = hole.id;
    group.appendChild(label);

    holesLayer.appendChild(group);
  }
  layers.appendChild(holesLayer);

  const screwsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  screwsLayer.setAttribute('pointer-events', 'none');
  for (const hole of draft.holes) {
    if (!draft.screws[hole.id]) continue;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('transform', `translate(${hole.x} ${hole.y})`);
    group.setAttribute('class', 'screw');

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('r', '18');
    head.setAttribute('class', 'screw-head');
    group.appendChild(head);
    screwsLayer.appendChild(group);
  }
  layers.appendChild(screwsLayer);
}

/** Resolve a canvas point to hole/plate when not hitting SVG targets directly. */
export function targetAtPoint(draft: EditorDraft, x: number, y: number): EditorPointerTarget {
  const hole = findHoleAtPointer(draft, x, y);
  if (hole) return { kind: 'hole', holeId: hole.id };
  return { kind: 'canvas' };
}
