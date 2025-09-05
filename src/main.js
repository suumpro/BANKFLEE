import { PF_CONFIG } from './game/constants.js';
import { PlatformerGame } from './game/platformer.js';
import { TopdownGame } from './game/topdown.js';

document.addEventListener('DOMContentLoaded', () => {
  if (PF_CONFIG.MODE === 'topdown') new TopdownGame();
  else new PlatformerGame();
});
