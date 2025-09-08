import { PF_CONFIG } from './game/constants.js';
import { PlatformerGame } from './game/platformer.js';
import { TopdownGame } from './game/topdown.js';
import { loadAssets } from './engine/assets.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadAssets({ player: 'assets/player.png' });
  if (PF_CONFIG.MODE === 'topdown') new TopdownGame();
  else new PlatformerGame();
});
