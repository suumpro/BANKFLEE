import { PF_CONFIG, PF_STATE, aabb } from './constants.js';
import { PF_Input } from '../engine/input.js';
import { PF_TileMap } from './tilemap.js';
import { PF_Camera } from './camera.js';
import { PF_Player } from './player.js';
import { PF_Coin, PF_PowerUp, PF_Goal, PF_PatrolEnemy } from './entities.js';

export class PlatformerGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = PF_STATE.MENU;
    this.input = new PF_Input();
    this.health = 100; this.score = 0;
    this.coins = []; this.collectedCoins = 0;
    this.goal = null; this.spikes = []; this.gasZones = [];
    this.iframes = 0; this.enemies = []; this.powerUps = [];

    this.levels = ['levels/level1.json', 'levels/level2.json'];
    this.levelIndex = 0;

    this.lastTime = 0; this.acc = 0; this.fixed = 1 / 60;
    this.map = null; this.player = null; this.camera = null;

    this._bindUI(); this._updateHUD();
    this._loadLevelByIndex(0);
    requestAnimationFrame((t) => this._loop(t));
  }

  _bindUI() {
    document.getElementById('startBtn').addEventListener('click', () => this.start());
    document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
    document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    document.getElementById('playAgainBtn').addEventListener('click', () => { this.levelIndex = 0; this._loadLevelByIndex(0).then(() => this.start()); });
  }

  async _loadLevel(url) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      this.map = new PF_TileMap(data);
      const ts = this.map.tileSize;
      const spawn = data.entities?.player || { x: 2, y: this.map.height - 5 };
      this.player = new PF_Player(spawn.x * ts + 3, spawn.y * ts - 2);
      this.camera = new PF_Camera(PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT, this.map);

      // Entities
      this.coins = []; this.collectedCoins = 0;
      const coinTiles = data.entities?.coins || [];
      for (const c of coinTiles) this.coins.push(new PF_Coin((c.x ?? c[0]) * ts + ts/2, (c.y ?? c[1]) * ts + ts/2));
      const goal = data.entities?.goal;
      this.goal = goal ? new PF_Goal(goal.x * ts, (goal.y - 2) * ts, ts, ts * 2) : null;

      // Hazards
      this.spikes = []; (data.entities?.spikes || []).forEach(s => this.spikes.push({ x: (s.x ?? 0) * ts, y: (s.y ?? 0) * ts, w: (s.w ?? 1) * ts, h: ts }));
      this.gasZones = []; (data.entities?.gas || data.entities?.gasZones || []).forEach(g => this.gasZones.push({ x: (g.x ?? 0) * ts, y: (g.y ?? 0) * ts, w: (g.w ?? 1) * ts, h: (g.h ?? 1) * ts }));

      // Enemies
      this.enemies = [];
      (data.entities?.enemies || []).forEach(e => {
        const ex = (e.x ?? 0) * ts; const ey = (e.y ?? 0) * ts - 24;
        const rangePx = (e.range ?? 6) * ts; const dir = e.dir ?? 1;
        this.enemies.push(new PF_PatrolEnemy(ex, ey, rangePx, dir));
      });

      // PowerUps
      this.powerUps = [];
      (data.entities?.powerUps || []).forEach(p => this.powerUps.push(new PF_PowerUp((p.x ?? 0) * ts + ts/2, (p.y ?? 0) * ts + ts/2, p.type || 'boots')));

      this._renderOnceMenu();
    } catch (e) { console.error('레벨 로드 실패', e); }
  }

  async _loadLevelByIndex(i) { this.levelIndex = i; await this._loadLevel(this.levels[i]); this.state = PF_STATE.MENU; this._updateHUD(); }
  start() { if (!this.map) return; this.state = PF_STATE.PLAYING; this.health = 100; document.getElementById('gameOverScreen').classList.add('hidden'); const t = document.querySelector('#gameOverScreen h2'); if (t) t.textContent='게임 오버!'; this._updateHUD(); }
  togglePause() { if (this.state === PF_STATE.PLAYING) this.state = PF_STATE.PAUSED; else if (this.state === PF_STATE.PAUSED) this.state = PF_STATE.PLAYING; }
  restart() { this._loadLevelByIndex(this.levelIndex).then(() => this.start()); }
  gameOver() { this.state = PF_STATE.GAME_OVER; document.getElementById('finalScore').textContent = this.score; document.getElementById('gameOverScreen').classList.remove('hidden'); }
  win() { this.state = PF_STATE.GAME_OVER; const t = document.querySelector('#gameOverScreen h2'); if (t) t.textContent='게임 클리어!'; document.getElementById('finalScore').textContent = this.score; document.getElementById('gameOverScreen').classList.remove('hidden'); }

  _updateHUD() {
    const scoreEl = document.getElementById('score');
    const healthEl = document.getElementById('health');
    const coinsEl = document.getElementById('coins');
    const levelEl = document.getElementById('level');
    const powEl = document.getElementById('powerups');
    if (scoreEl) scoreEl.textContent = `점수: ${this.score}`;
    if (healthEl) healthEl.textContent = `체력: ${Math.ceil(this.health)}`;
    if (coinsEl) coinsEl.textContent = `코인: ${this.collectedCoins}`;
    if (levelEl) levelEl.textContent = `레벨: ${this.levelIndex + 1}`;
    if (powEl) powEl.textContent = `파워업: ${this._powerupText()}`;
  }
  _powerupText() {
    if (!this.player) return '-';
    const p = this.player.powerUps; const parts = [];
    if (p.umbrella.uses > 0) parts.push(`U×${p.umbrella.uses}`);
    if (p.boots.active) parts.push(`B ${Math.ceil(p.boots.timer/1000)}s`);
    if (p.mask.active) parts.push(`M ${Math.ceil(p.mask.timer/1000)}s`);
    if (p.gas_mask.active) parts.push(`G ${Math.ceil(p.gas_mask.timer/1000)}s`);
    return parts.length ? parts.join(' | ') : '-';
  }

  _loop(current) {
    const now = current / 1000; let dt = this.lastTime ? now - this.lastTime : 0; if (dt > 0.25) dt = 0.25; this.lastTime = now; this.acc += dt;
    while (this.acc >= this.fixed) {
      // Process inputs that occurred since last tick inside update,
      // then clear one-shot flags afterwards so we don't miss jumps.
      this._update(this.fixed);
      this.input.resetJusts();
      this.acc -= this.fixed;
    }
    this._render(); requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    if (this.state !== PF_STATE.PLAYING) return; if (!this.map || !this.player) return;
    this.player.update(dt, this.input, this.map); this.camera.follow(this.player.x, this.player.y);
    for (const en of this.enemies) en.update(dt, this.map); for (const pu of this.powerUps) pu.update(dt);
    this._checkEnemyCollisions(); this._checkHazards(dt);
    // coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i]; if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, c.x, c.y, c.w, c.h)) { this.coins.splice(i, 1); this.collectedCoins += 1; this.score += 10; this._updateHUD(); }
    }
    // powerups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i]; if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, p.x, p.y, p.w, p.h)) { this.player.applyPowerUp(p.type); this.powerUps.splice(i, 1); this.score += 20; this._updateHUD(); }
    }
    // goal
    if (this.goal && aabb(this.player.x, this.player.y, this.player.w, this.player.h, this.goal.x, this.goal.y, this.goal.w, this.goal.h)) {
      this.state = PF_STATE.LEVEL_COMPLETE; this.score += 100; this._updateHUD(); setTimeout(() => this.nextLevel(), 600); return;
    }
    const worldH = this.map.height * this.map.tileSize; if (this.player.y > worldH + 200) { this.health = 0; this._updateHUD(); this.gameOver(); }
  }

  _drawBackground() {
    const g = this.ctx.createLinearGradient(0, 0, 0, PF_CONFIG.HEIGHT);
    g.addColorStop(0, '#87CEEB'); g.addColorStop(0.7, '#FFA07A'); g.addColorStop(1, '#228B22');
    this.ctx.fillStyle = g; this.ctx.fillRect(0, 0, PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT);
    const parallaxX = Math.floor(this.camera ? this.camera.x * 0.5 : 0);
    const rng = [ { w: 80, h: 220, c: '#696969' }, { w: 60, h: 260, c: '#708090' }, { w: 90, h: 240, c: '#778899' }, { w: 70, h: 280, c: '#696969' } ];
    let x = -(parallaxX % 200) - 200; while (x < PF_CONFIG.WIDTH + 200) { rng.forEach(b => { this.ctx.fillStyle = b.c; this.ctx.fillRect(x, PF_CONFIG.HEIGHT - b.h - 100, b.w, b.h); x += b.w + 30; }); x += 100; }
  }

  _renderOnceMenu() {
    this._drawBackground(); this.ctx.fillStyle = '#8B4513'; this.ctx.fillRect(0, PF_CONFIG.HEIGHT - 100, PF_CONFIG.WIDTH, 100);
    if (this.map) this.map.render(this.ctx, new PF_Camera(PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT, this.map));
    if (this.player) this.player.render(this.ctx, { x: 0, y: 0 });
  }

  _render() {
    this._drawBackground(); this.ctx.fillStyle = '#8B4513'; this.ctx.fillRect(0, PF_CONFIG.HEIGHT - 100, PF_CONFIG.WIDTH, 100);
    if (this.map && this.camera) this.map.render(this.ctx, this.camera);
    this._renderHazards(); if (this.goal && this.camera) this.goal.render(this.ctx, this.camera);
    if (this.powerUps && this.camera) this.powerUps.forEach(p => p.render(this.ctx, this.camera));
    if (this.enemies && this.camera) this.enemies.forEach(en => en.render(this.ctx, this.camera));
    if (this.coins && this.camera) this.coins.forEach(c => c.render(this.ctx, this.camera));
    if (this.player && this.camera) this.player.render(this.ctx, this.camera);
    if (this.state === PF_STATE.PAUSED) { this._overlay('일시정지', 48); }
    else if (this.state === PF_STATE.MENU) { this._overlay('시작 버튼을 눌러주세요!', 36); }
    else if (this.state === PF_STATE.LEVEL_COMPLETE) { this._overlay('레벨 클리어!', 36); }
    this.ctx.textAlign = 'left';
  }
  _overlay(text, size) { this.ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.ctx.fillRect(0,0,PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT); this.ctx.fillStyle = 'white'; this.ctx.font = `${size}px Arial`; this.ctx.textAlign = 'center'; this.ctx.fillText(text, PF_CONFIG.WIDTH/2, PF_CONFIG.HEIGHT/2); }

  nextLevel() { if (this.levelIndex + 1 < this.levels.length) { this._loadLevelByIndex(this.levelIndex + 1).then(() => this.start()); } else { this.win(); } }

  _checkEnemyCollisions() {
    if (this.iframes > 0) return;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]; if (!e.alive) continue;
      if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, e.x, e.y, e.w, e.h)) {
        const fromAbove = (this.player.vy > 0) && ((this.player.y + this.player.h) - e.y < 10);
        if (fromAbove) { e.alive = false; this.enemies.splice(i, 1); this.score += 30; this.player.vy = -PF_CONFIG.JUMP_SPEED * 0.55; this._updateHUD(); }
        else { this._damage(25, 'enemy'); this.iframes = 0.6; const pcx = this.player.x + this.player.w/2; const ecx = e.x + e.w/2; const dir = pcx < ecx ? -1 : 1; this.player.vx = dir * PF_CONFIG.MAX_RUN_SPEED * 0.6; this.player.vy = -PF_CONFIG.JUMP_SPEED * 0.35; }
      }
    }
  }

  _checkHazards(dt) {
    if (this.iframes > 0) this.iframes = Math.max(0, this.iframes - dt);
    let inGas = false; for (const g of this.gasZones) if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, g.x, g.y, g.w, g.h)) { inGas = true; break; }
    if (inGas) { let dps = 15; if (this.player.powerUps.gas_mask.active) dps = 0; else if (this.player.powerUps.mask.active) dps *= 0.4; if (dps > 0) this._damage(dps * dt, 'gas'); }
    if (this.iframes <= 0) {
      for (const s of this.spikes) {
        const bandH = 14; const bx = s.x; const by = s.y + (s.h - bandH); const bw = s.w; const bh = bandH;
        if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, bx, by, bw, bh)) { this._damage(35, 'spikes'); this.iframes = 0.6; break; }
      }
    }
  }

  _damage(amount, type) {
    if (this.state !== PF_STATE.PLAYING) return;
    if (this.player.powerUps.umbrella.active && this.player.powerUps.umbrella.uses > 0) { this.player.powerUps.umbrella.uses -= 1; if (this.player.powerUps.umbrella.uses <= 0) this.player.powerUps.umbrella.active = false; this.iframes = Math.max(this.iframes, 0.4); this._updateHUD(); return; }
    this.health = Math.max(0, this.health - amount); this._updateHUD(); if (this.health <= 0) this.gameOver();
  }

  _renderHazards() {
    if (!this.camera) return; const ctx = this.ctx;
    ctx.save(); ctx.fillStyle = '#AA3333';
    for (const s of this.spikes) {
      const tiles = Math.max(1, Math.floor(s.w / PF_CONFIG.TILE));
      for (let i = 0; i < tiles; i++) {
        const x0 = s.x + i * PF_CONFIG.TILE - this.camera.x; const y0 = s.y - this.camera.y; const w = PF_CONFIG.TILE; const h = PF_CONFIG.TILE;
        ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + w/2, y0 + h - 16); ctx.lineTo(x0 + w, y0 + h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5c1f1f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
        if (PF_CONFIG.SHOW_LABELS) {
          ctx.fillStyle = '#000'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
          ctx.fillText('스파이크', x0 + w/2, y0 + h - 20);
        }
      }
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.35;
    for (const g of this.gasZones) {
      const sx = g.x - this.camera.x; const sy = g.y - this.camera.y;
      const grad = ctx.createLinearGradient(0, sy, 0, sy + g.h); grad.addColorStop(0, '#7CFC00'); grad.addColorStop(1, '#228B22');
      ctx.fillStyle = grad; ctx.fillRect(sx, sy, g.w, g.h);
      if (PF_CONFIG.SHOW_LABELS) {
        ctx.save(); ctx.globalAlpha = 1.0; ctx.fillStyle = '#052'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText('은행(피하기)', sx + g.w/2, sy + 14);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}
