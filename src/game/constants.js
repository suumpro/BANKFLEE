// Platformer constants and states
export const PF_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  TILE: 32,
  MODE: 'topdown',
  GRAVITY: 2000,
  RUN_ACCEL: 4000,
  RUN_FRICTION: 5000,
  AIR_FRICTION: 800,
  MAX_RUN_SPEED: 280,
  JUMP_SPEED: 650,
  COYOTE_TIME: 0.10,
  JUMP_BUFFER: 0.12,
  SHOW_LABELS: true,
  // Topdown-specific
  TD_SCROLL_SPEED: 110,       // px/s downward world flow
  TD_PLAYER_SPEED: 260,       // px/s
  TD_PLAYER_FRICTION: 1800,   // px/s^2
  TD_PEDESTRIAN_SPEED: 80,    // base px/s
  TD_SPAWN_PEDESTRIAN_EVERY: 0.9, // seconds
  TD_SPAWN_BANK_EVERY: 1.6,   // seconds
  // Topdown jump
  TD_JUMP_SPEED: 360,
  TD_JUMP_GRAVITY: 1200,
  TD_JUMP_COOLDOWN: 0.35
};

export const PF_STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  LEVEL_COMPLETE: 'level_complete'
};

export const PF_ENEMY = {
  WALK_SPEED: 70,
  GRAVITY: 2000
};

export function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
