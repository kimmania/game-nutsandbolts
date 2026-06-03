/** SVG puzzle view — keep level stash `y` at {@link STASH_HOLE_Y}. */
export const VIEW_WIDTH = 400;
export const VIEW_HEIGHT = 540;

export const BOARD_WOOD = {
  x: 24,
  y: 60,
  width: 352,
  height: 220,
} as const;

/** Bottom edge of the wood panel (start of plate drop gutter). */
export const BOARD_WOOD_BOTTOM = BOARD_WOOD.y + BOARD_WOOD.height;

/** Spare-hole row — below the drop gutter so falling plates do not cover taps. */
export const STASH_LABEL_Y = 408;
export const STASH_HOLE_Y = 458;

export const FLOATING_SCREW_X = 200;
export const FLOATING_SCREW_Y = 498;

/** How far dropped plates move downward (stays above {@link STASH_HOLE_Y}). */
export const PLATE_DROP_PX = 56;
