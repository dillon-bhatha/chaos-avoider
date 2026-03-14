export const W = 640;
export const H = 480;
export const PLAYER_R = 13;
export const PLAYER_SPEED = 5;
export const TRAIL_LEN = 20;
export const BASE_SPEED = 2.0;
export const BASE_INTERVAL = 55;
export const MIN_INTERVAL = 11;
export const SPEED_STEP = 0.22;
export const INTERVAL_STEP = 2.0;
export const STAR_COUNT = 60;
export const GRID_SIZE = 48;
export const SHAKE_DECAY = 0.82;
export const LS_KEY_SOLO = 'chaos_hs_solo';
export const LS_KEY_MULTI = 'chaos_hs_multi';
export const FLIP_INTERVAL = 15 * 60;
export const ARENA_SHRINK_DUR = 70 * 60;
export const ARENA_MAX_FRAC = 0.22;
export const HUE_A = 190;
export const HUE_B = 320;
export const HUE_CYCLE_RATE = 0.35;
export const SAFE_HUE_RANGE = 42;
export const SAFE_BONUS = 5;
export const GHOST_ALPHA = 0.09;
export const BPM_OPTIONS = [80, 128, 160];

export const BLOCK_TYPES = [
  { w: 55, h: 18, spdMul: 1.0 },
  { w: 90, h: 15, spdMul: 0.75 },
  { w: 35, h: 13, spdMul: 1.6 },
  { w: 70, h: 26, spdMul: 0.9 },
];

export const MAIN_ITEMS = [
  { label: 'SOLO',        sub: 'Play alone with custom settings' },
  { label: 'CO-OP',       sub: 'Two players on one keyboard'     },
  { label: 'MULTIPLAYER', sub: 'Play online with a friend'       },
  { label: 'MUSIC',       sub: 'Configure beat and BPM'         },
];

export const SOLO_FEATURES = [
  { key: 'mirrorPlayer', label: 'Mirror Player',   desc: 'Mirrored second player — both must survive'          },
  { key: 'gravityFlip',  label: 'Gravity Flip',    desc: 'Gravity flips every 15s · SPACE flips manually'      },
  { key: 'colorMatch',   label: 'Color Match',     desc: 'Match your color to safely touch blocks for a bonus' },
  { key: 'shrinkArena',  label: 'Shrinking Arena', desc: 'Walls close in slowly over 70 seconds'               },
  { key: 'ghostRun',     label: 'Ghost Run',       desc: 'Your previous run haunts you as a faint overlay'     },
];
