import {
  canPickScrew,
  canPlaceScrew,
  stashCapacity,
  stashUsedCount,
} from '../core/board';
import type { GameState, HoleState, PlateState } from '../core/types';

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 460;

export type BoardRenderOptions = {
  reducedMotion?: boolean;
};

type BoardElements = {
  svg: SVGSVGElement;
  platesLayer: SVGGElement;
  holesLayer: SVGGElement;
  screwsLayer: SVGGElement;
  hintEl: HTMLElement;
  knownRemoved: Set<string>;
  dropTimers: number[];
};

export function createBoard(
  container: HTMLElement,
  hintEl: HTMLElement,
  onHoleTap: (holeId: string) => void,
): BoardElements {
  container.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.setAttribute('class', 'puzzle-board');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Puzzle board');

  const wood = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  wood.setAttribute('x', '24');
  wood.setAttribute('y', '60');
  wood.setAttribute('width', '352');
  wood.setAttribute('height', '220');
  wood.setAttribute('rx', '16');
  wood.setAttribute('class', 'board-wood');
  svg.appendChild(wood);

  const platesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  platesLayer.setAttribute('class', 'plates-layer');
  svg.appendChild(platesLayer);

  const screwsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  screwsLayer.setAttribute('class', 'screws-layer');
  svg.appendChild(screwsLayer);

  const holesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  holesLayer.setAttribute('class', 'holes-layer');
  svg.appendChild(holesLayer);

  const stashLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  stashLabel.setAttribute('x', '200');
  stashLabel.setAttribute('y', '340');
  stashLabel.setAttribute('text-anchor', 'middle');
  stashLabel.setAttribute('class', 'stash-label');
  stashLabel.textContent = 'Spare holes';
  svg.appendChild(stashLabel);

  container.appendChild(svg);

  const board: BoardElements = {
    svg,
    platesLayer,
    holesLayer,
    screwsLayer,
    hintEl,
    knownRemoved: new Set(),
    dropTimers: [],
  };

  svg.addEventListener('click', (event) => {
    const target = (event.target as Element).closest('[data-hole-id]');
    if (!target) return;
    const holeId = target.getAttribute('data-hole-id');
    if (holeId) onHoleTap(holeId);
  });

  return board;
}

const SCREW_PAD = 24;

function anchorHolesForPlate(plate: PlateState, holes: HoleState[]): HoleState[] {
  return plate.anchors
    .map((id) => holes.find((hole) => hole.id === id))
    .filter((hole): hole is HoleState => hole !== undefined);
}

/** Size and position the plate so every anchor hole sits on the metal. */
function plateLayout(
  plate: PlateState,
  holes: HoleState[],
): { x: number; y: number; angle: number; width: number; height: number } {
  const anchorHoles = anchorHolesForPlate(plate, holes);

  if (anchorHoles.length === 0) {
    return { x: 200, y: 180, angle: 0, width: plate.width, height: plate.height };
  }

  if (anchorHoles.length === 1) {
    const [only] = anchorHoles;
    return {
      x: only.x,
      y: only.y,
      angle: 0,
      width: plate.width,
      height: plate.height,
    };
  }

  const ordered = plate.anchors
    .map((id) => anchorHoles.find((hole) => hole.id === id))
    .filter((hole): hole is HoleState => hole !== undefined);
  const [first, second] = ordered;
  const angle =
    (Math.atan2(second.y - first.y, second.x - first.x) * 180) / Math.PI;

  const xs = anchorHoles.map((hole) => hole.x);
  const ys = anchorHoles.map((hole) => hole.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const width = Math.max(plate.width, spanX + SCREW_PAD * 2);
  const height = Math.max(plate.height, spanY + SCREW_PAD * 2);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;

  return { x, y, angle, width, height };
}

function appendPlateGraphic(
  layer: SVGGElement,
  plate: PlateState,
  holes: HoleState[],
  className: string,
): void {
  const { x, y, angle, width, height } = plateLayout(plate, holes);
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', className);
  group.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(-width / 2));
  rect.setAttribute('y', String(-height / 2));
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('rx', '8');
  group.appendChild(rect);
  layer.appendChild(group);
}

function renderPlates(board: BoardElements, state: GameState, options: BoardRenderOptions): void {
  for (const timer of board.dropTimers) {
    window.clearTimeout(timer);
  }
  board.dropTimers = [];

  const removedNow = state.plates.filter((plate) => plate.removed);
  const newlyRemoved = removedNow.filter((plate) => !board.knownRemoved.has(plate.id));
  const animateDrop = !options.reducedMotion && newlyRemoved.length > 0;

  board.platesLayer.replaceChildren();

  const active = [...state.plates]
    .filter((plate) => !plate.removed)
    .sort((a, b) => a.layer - b.layer);

  for (const plate of active) {
    appendPlateGraphic(board.platesLayer, plate, state.holes, 'plate');
  }

  if (animateDrop) {
    for (const plate of newlyRemoved) {
      appendPlateGraphic(board.platesLayer, plate, state.holes, 'plate plate-dropping');
    }
    const timer = window.setTimeout(() => {
      for (const node of board.platesLayer.querySelectorAll('.plate-dropping')) {
        node.remove();
      }
    }, 420);
    board.dropTimers.push(timer);
  }

  board.knownRemoved = new Set(removedNow.map((plate) => plate.id));
}

function renderHoles(board: BoardElements, state: GameState): void {
  board.holesLayer.replaceChildren();

  for (const hole of state.holes) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-hole-id', hole.id);
    group.setAttribute('class', `hole hole-${hole.kind}`);
    group.setAttribute('transform', `translate(${hole.x} ${hole.y})`);

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hit.setAttribute('r', '26');
    hit.setAttribute('class', 'hole-hit');
    group.appendChild(hit);

    if (!hole.screwId) {
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('r', '14');
      ring.setAttribute('class', 'hole-ring');
      group.appendChild(ring);
    }

    const canInteract =
      state.status === 'playing' &&
      (canPickScrew(state, hole.id) || canPlaceScrew(state, hole.id));

    if (state.pickedScrew && canPlaceScrew(state, hole.id)) {
      group.classList.add('hole-target');
    }
    if (canPickScrew(state, hole.id)) {
      group.classList.add('hole-pickable');
    }
    if (!canInteract && state.status === 'playing') {
      group.classList.add('hole-disabled');
    }

    board.holesLayer.appendChild(group);
  }
}

function renderScrews(
  board: BoardElements,
  state: GameState,
  options: BoardRenderOptions,
): void {
  board.screwsLayer.replaceChildren();

  for (const hole of state.holes) {
    if (!hole.screwId) continue;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-hole-id', hole.id);
    const pickable = canPickScrew(state, hole.id);
    group.setAttribute(
      'class',
      pickable ? 'screw screw-pickable' : 'screw',
    );
    group.setAttribute('transform', `translate(${hole.x} ${hole.y})`);

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hit.setAttribute('r', '26');
    hit.setAttribute('class', 'screw-hit');
    group.appendChild(hit);

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('r', '18');
    head.setAttribute('class', 'screw-head');
    group.appendChild(head);

    const slot = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    slot.setAttribute('x1', '-8');
    slot.setAttribute('y1', '0');
    slot.setAttribute('x2', '8');
    slot.setAttribute('y2', '0');
    slot.setAttribute('class', 'screw-slot');
    group.appendChild(slot);

    board.screwsLayer.appendChild(group);
  }

  if (state.pickedScrew) {
    const floater = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    floater.setAttribute(
      'class',
      options.reducedMotion ? 'screw screw-floating' : 'screw screw-floating screw-picked',
    );
    floater.setAttribute('transform', 'translate(200 420)');

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('r', '22');
    head.setAttribute('class', 'screw-head screw-head-active');
    floater.appendChild(head);

    const slot = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    slot.setAttribute('x1', '-10');
    slot.setAttribute('y1', '0');
    slot.setAttribute('x2', '10');
    slot.setAttribute('y2', '0');
    slot.setAttribute('class', 'screw-slot');
    floater.appendChild(slot);

    board.screwsLayer.appendChild(floater);
  }
}

function updateHint(board: BoardElements, state: GameState): void {
  const used = stashUsedCount(state);
  const cap = stashCapacity(state);

  if (state.status === 'won') {
    board.hintEl.textContent = 'All plates cleared! Tap Next level.';
    return;
  }
  if (state.status === 'stuck') {
    board.hintEl.textContent = 'No moves left. Tap Restart to try again.';
    return;
  }
  if (state.pickedScrew) {
    board.hintEl.textContent = `Bolt in hand — tap an empty hole. Spare: ${used}/${cap}`;
    return;
  }
  board.hintEl.textContent = `Tap a bolt to unscrew it. Spare holes: ${used}/${cap}`;
}

export function resetBoardAnimationState(board: BoardElements): void {
  for (const timer of board.dropTimers) {
    window.clearTimeout(timer);
  }
  board.dropTimers = [];
  board.knownRemoved = new Set();
}

export function renderBoard(
  board: BoardElements,
  state: GameState,
  options: BoardRenderOptions = {},
): void {
  renderPlates(board, state, options);
  renderScrews(board, state, options);
  renderHoles(board, state);
  updateHint(board, state);
}
