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
  TD_JUMP_COOLDOWN: 0.35,
  // Topdown balance knobs
  TD_STAGE_DURATION: 30,       // seconds per stage
  TD_DIFFICULTY_STAGE_STEP: 0.22, // +22% per stage
  TD_DIFFICULTY_TIME_RATE: 0.02,  // +2% per sec up to cap
  TD_DIFFICULTY_TIME_CAP: 0.8,    // up to +80% within stage
  TD_XP_BASE: 100,
  TD_XP_GROWTH: 1.5,
  TD_XP_PER_SEC: 3,            // passive XP per second
  TD_XP_PER_COIN: 4,           // extra XP per coin
  TD_COIN_SPAWN_EVERY: 2.8,    // base seconds between coins
  TD_COIN_MAGNET_ACCEL: 280,   // px/s^2 attraction
  TD_COIN_MAGNET_SPEED: 220    // px/s clamp for coins when magnetized
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
