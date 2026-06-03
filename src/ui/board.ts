import {
  canPickScrew,
  canPlaceScrew,
  stashCapacity,
  stashUsedCount,
} from '../core/board';
import type { GameState } from '../core/types';
import {
  plateLayout,
  plateLayoutRigidTransform,
  screwsOnPlate,
  type PlateLayout,
} from './plateLayout';
import {
  BOARD_WOOD,
  FLOATING_SCREW_X,
  FLOATING_SCREW_Y,
  PLATE_DROP_PX,
  STASH_LABEL_Y,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './viewLayout';

const PLATE_CLIP_ID = 'plate-drop-clip';

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
  plateScrewCounts: Map<string, number>;
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
  wood.setAttribute('x', String(BOARD_WOOD.x));
  wood.setAttribute('y', String(BOARD_WOOD.y));
  wood.setAttribute('width', String(BOARD_WOOD.width));
  wood.setAttribute('height', String(BOARD_WOOD.height));
  wood.setAttribute('rx', '16');
  wood.setAttribute('class', 'board-wood');
  svg.appendChild(wood);

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
  clipPath.setAttribute('id', PLATE_CLIP_ID);
  const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  clipRect.setAttribute('x', '0');
  clipRect.setAttribute('y', '0');
  clipRect.setAttribute('width', String(VIEW_WIDTH));
  clipRect.setAttribute('height', String(STASH_LABEL_Y - 6));
  clipPath.appendChild(clipRect);
  defs.appendChild(clipPath);
  svg.appendChild(defs);

  const platesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  platesLayer.setAttribute('class', 'plates-layer');
  platesLayer.setAttribute('clip-path', `url(#${PLATE_CLIP_ID})`);
  svg.appendChild(platesLayer);

  const screwsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  screwsLayer.setAttribute('class', 'screws-layer');
  svg.appendChild(screwsLayer);

  const holesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  holesLayer.setAttribute('class', 'holes-layer');
  svg.appendChild(holesLayer);

  const stashLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  stashLabel.setAttribute('x', String(FLOATING_SCREW_X));
  stashLabel.setAttribute('y', String(STASH_LABEL_Y));
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
    plateScrewCounts: new Map(),
  };

  svg.addEventListener('click', (event) => {
    const target = (event.target as Element).closest('[data-hole-id]');
    if (!target) return;
    const holeId = target.getAttribute('data-hole-id');
    if (holeId) onHoleTap(holeId);
  });

  return board;
}

const HANG_TILT_MS = 360;

function appendPlateGraphic(
  layer: SVGGElement,
  layout: PlateLayout,
  className: string,
  transform: string,
): SVGGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', className);
  group.setAttribute('transform', transform);

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(-layout.width / 2));
  rect.setAttribute('y', String(-layout.height / 2));
  rect.setAttribute('width', String(layout.width));
  rect.setAttribute('height', String(layout.height));
  rect.setAttribute('rx', '8');
  group.appendChild(rect);
  layer.appendChild(group);
  return group;
}

function animatePlateHang(
  group: SVGGElement,
  fromTransform: string,
  toTransform: string,
): void {
  const animation = group.animate(
    [{ transform: fromTransform }, { transform: toTransform }],
    { duration: HANG_TILT_MS, easing: 'ease-out', fill: 'forwards' },
  );
  animation.onfinish = () => {
    group.setAttribute('transform', toTransform);
  };
}

function renderPlates(board: BoardElements, state: GameState, options: BoardRenderOptions): void {
  for (const timer of board.dropTimers) {
    window.clearTimeout(timer);
  }
  board.dropTimers = [];

  const prevScrewCounts = board.plateScrewCounts;
  const nextScrewCounts = new Map<string, number>();

  const removedNow = state.plates.filter((plate) => plate.removed);
  const newlyRemoved = removedNow.filter((plate) => !board.knownRemoved.has(plate.id));
  const animateDrop = !options.reducedMotion && newlyRemoved.length > 0;

  board.platesLayer.replaceChildren();

  const active = [...state.plates]
    .filter((plate) => !plate.removed)
    .sort((a, b) => a.layer - b.layer);

  for (const plate of active) {
    const screwCount = screwsOnPlate(plate, state.holes);
    nextScrewCounts.set(plate.id, screwCount);

    const layout = plateLayout(plate, state.holes, state.plates);
    const prevCount = prevScrewCounts.get(plate.id);
    const shouldTilt =
      !options.reducedMotion &&
      layout.mode === 'hang' &&
      prevCount !== undefined &&
      prevCount >= 2 &&
      screwCount === 1;

    const rigidTransform = plateLayoutRigidTransform(plate, state.holes);
    const group = appendPlateGraphic(
      board.platesLayer,
      layout,
      'plate',
      shouldTilt ? rigidTransform : layout.transform,
    );

    if (shouldTilt) {
      animatePlateHang(group, rigidTransform, layout.transform);
    }
  }

  if (animateDrop) {
    for (const plate of newlyRemoved) {
      const layout = plateLayout(plate, state.holes, state.plates);
      const group = appendPlateGraphic(
        board.platesLayer,
        layout,
        'plate plate-dropping',
        layout.transform,
      );
      const match = layout.transform.match(/rotate\(([-\d.]+)\)/);
      const angle = match ? match[1] : '0';
      group.style.setProperty('--drop-r', `${angle}deg`);
      group.style.setProperty('--drop-dy', `${PLATE_DROP_PX}px`);
    }
    const timer = window.setTimeout(() => {
      for (const node of board.platesLayer.querySelectorAll('.plate-dropping')) {
        node.remove();
      }
    }, 420);
    board.dropTimers.push(timer);
  }

  board.plateScrewCounts = nextScrewCounts;
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
    floater.setAttribute('transform', `translate(${FLOATING_SCREW_X} ${FLOATING_SCREW_Y})`);

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
  board.plateScrewCounts = new Map();
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
