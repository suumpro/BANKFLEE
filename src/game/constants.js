// Platformer constants and states
export const PF_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  TILE: 32,
  GRAVITY: 2000,
  RUN_ACCEL: 4000,
  RUN_FRICTION: 5000,
  AIR_FRICTION: 800,
  MAX_RUN_SPEED: 280,
  JUMP_SPEED: 650,
  COYOTE_TIME: 0.10,
  JUMP_BUFFER: 0.12
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

