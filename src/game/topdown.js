import { PF_CONFIG, PF_STATE, aabb } from './constants.js';
import { AudioManager } from '../engine/audio.js';
import { PF_Input } from '../engine/input.js';
import { loadProfile, recordRun, updatePlayerName, addCredits, getUpgradesState, purchaseUpgrade, UPGRADE_DEFS, getDifficulty, setDifficulty, getSettings, setMuted } from '../engine/storage.js';

class TD_Player {
  constructor(x, y) {
    this.w = 26; this.h = 30; this.x = x; this.y = y;
    this.vx = 0; this.vy = 0; this.color = '#FF6B35';
    // topdown jump state
    this.z = 0; this.vz = 0; this.jumpCD = 0;
    this._justJump = false; this._justLand = false;
    // scaling stats from level-ups
    this.statSpeedMul = 1.0;
    // power-ups
    this.powerUps = {
      mask: { active: false, timer: 0 },
      gas_mask: { active: false, timer: 0 },
      boots: { active: false, timer: 0 },
      umbrella: { active: false, uses: 0 }
    };
  }
  update(dt, input) {
    const wantX = (input.isLeft() ? -1 : 0) + (input.isRight() ? 1 : 0);
    const wantY = (input.isUp() ? -1 : 0) + (input.isDownKey() ? 1 : 0);
    const speed = PF_CONFIG.TD_PLAYER_SPEED * this.speedMultiplier();
    const ax = wantX * speed * 3.5; // accel quick
    const ay = wantY * speed * 3.5;
    this.vx += ax * dt; this.vy += ay * dt;
    // friction
    const fr = PF_CONFIG.TD_PLAYER_FRICTION * dt;
    if (wantX === 0) {
      if (Math.abs(this.vx) <= fr) this.vx = 0; else this.vx -= Math.sign(this.vx) * fr;
    }
    if (wantY === 0) {
      if (Math.abs(this.vy) <= fr) this.vy = 0; else this.vy -= Math.sign(this.vy) * fr;
    }
    // clamp speed
    const max = PF_CONFIG.TD_PLAYER_SPEED * this.speedMultiplier();
    this.vx = Math.max(-max, Math.min(max, this.vx));
    this.vy = Math.max(-max, Math.min(max, this.vy));
    // integrate
    this.x += this.vx * dt; this.y += this.vy * dt;
    // jump input
    if (this.jumpCD > 0) this.jumpCD = Math.max(0, this.jumpCD - dt);
    if (input.jumpDown() && this.z <= 0 && this.jumpCD <= 0) {
      this.vz = PF_CONFIG.TD_JUMP_SPEED;
      this.z = 0.001; // takeoff
      this.jumpCD = PF_CONFIG.TD_JUMP_COOLDOWN;
      this._justJump = true;
    }
    if (input.jumpUp() && this.vz > 0) this.vz *= 0.55; // short hop
    // vertical physics
    if (this.z > 0 || this.vz > 0) {
      this.vz -= PF_CONFIG.TD_JUMP_GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) { this.z = 0; this.vz = 0; this._justLand = true; }
    }
    // bounds: keep inside screen
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.y < 0) { this.y = 0; this.vy = 0; }
    if (this.x + this.w > PF_CONFIG.WIDTH) { this.x = PF_CONFIG.WIDTH - this.w; this.vx = 0; }
    if (this.y + this.h > PF_CONFIG.HEIGHT) { this.y = PF_CONFIG.HEIGHT - this.h; this.vy = 0; }
  }
  isAirborne() { return this.z > 4; }
  consumeJustJump() { const j = this._justJump; this._justJump = false; return j; }
  consumeJustLand() { const j = this._justLand; this._justLand = false; return j; }
  applyPowerUp(type) {
    switch (type) {
      case 'mask':
        // mask reduces gas damage; reset timer
        this.powerUps.mask.active = true; this.powerUps.mask.timer = 10000;
        break;
      case 'gas_mask':
        // gas_mask supersedes mask while active
        this.powerUps.gas_mask.active = true; this.powerUps.gas_mask.timer = 20000;
        break;
      case 'boots':
        // speed boost; refresh duration
        this.powerUps.boots.active = true; this.powerUps.boots.timer = 15000;
        break;
      case 'umbrella': this.powerUps.umbrella.active = true; this.powerUps.umbrella.uses += 1; break;
    }
  }
  speedMultiplier() { return (this.powerUps.boots.active ? 1.3 : 1.0) * (this.statSpeedMul || 1.0); }
  updatePowerUpTimers(dt) {
    const dms = dt * 1000;
    if (this.powerUps.mask.active) { this.powerUps.mask.timer -= dms; if (this.powerUps.mask.timer <= 0) this.powerUps.mask.active = false; }
    if (this.powerUps.gas_mask.active) { this.powerUps.gas_mask.timer -= dms; if (this.powerUps.gas_mask.timer <= 0) this.powerUps.gas_mask.active = false; }
    if (this.powerUps.boots.active) { this.powerUps.boots.timer -= dms; if (this.powerUps.boots.timer <= 0) this.powerUps.boots.active = false; }
  }
  render(ctx) {
    // shadow
    const shadowAlpha = this.isAirborne() ? 0.25 : 0.4;
    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = '#000';
    const sx = Math.floor(this.x + this.w/2);
    const sy = Math.floor(this.y + this.h - 6);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 12, 5, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    // body lifted by z
    ctx.fillStyle = this.color;
    const spMul = this.speedMultiplier();
    const bodyX = Math.floor(this.x);
    const bodyY = Math.floor(this.y - this.z);
    ctx.fillRect(bodyX, bodyY, this.w, this.h);
    if (spMul > 1.01) {
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#FFB085';
      ctx.fillRect(bodyX - 2, bodyY + 4, this.w + 4, this.h - 8);
      ctx.restore();
    }
    // face
    ctx.fillStyle = '#333';
    ctx.fillRect(Math.floor(this.x + 6), Math.floor(this.y - this.z + 6), 4, 4);
    ctx.fillRect(Math.floor(this.x + 16), Math.floor(this.y - this.z + 6), 4, 4);
  }
}

class TD_Pedestrian {
  constructor(x, y, behavior = 'straight') {
    this.w = 24; this.h = 24; this.x = x; this.y = y; this.speed = PF_CONFIG.TD_PEDESTRIAN_SPEED * (0.8 + Math.random()*0.6);
    this.behavior = behavior; this.t = 0; this.phase = Math.random()*Math.PI*2; this.amp = 24 + Math.random()*18; this.freq = 2 + Math.random()*1.2; this.vx = 0;
  }
  update(dt, scroll) {
    this.t += dt;
    if (this.behavior === 'zigzag') {
      // horizontal wiggle within walkway bounds
      this.vx = Math.cos(this.phase + this.t * this.freq) * 60;
      this.x += this.vx * dt;
      // clamp to walkway
      const minX = 60; const maxX = PF_CONFIG.WIDTH - 60 - this.w;
      if (this.x < minX) this.x = minX;
      if (this.x > maxX) this.x = maxX;
    }
    this.y += (scroll + this.speed) * dt;
  }
  render(ctx) {
    const sx = Math.floor(this.x); const sy = Math.floor(this.y);
    ctx.fillStyle = '#8B0000'; ctx.fillRect(sx, sy, this.w, this.h);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, this.w, this.h);
    ctx.fillStyle = '#FFF'; ctx.fillRect(sx + 6, sy + 6, 4, 4); ctx.fillRect(sx + this.w - 10, sy + 6, 4, 4);
    if (PF_CONFIG.SHOW_LABELS) { ctx.fillStyle = '#111'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText('보행자', sx + this.w/2, sy - 4); }
  }
}

class TD_BankZone { // hazard
  constructor(x, w, h) { this.x = x; this.y = -h; this.w = w; this.h = h; }
  update(dt, scroll) { this.y += scroll * dt; }
  render(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    const sx = this.x; const sy = this.y;
    const grad = ctx.createLinearGradient(0, sy, 0, sy + this.h); grad.addColorStop(0, '#7CFC00'); grad.addColorStop(1, '#228B22');
    ctx.fillStyle = grad; ctx.fillRect(sx, sy, this.w, this.h);
    ctx.restore();
    if (PF_CONFIG.SHOW_LABELS) { ctx.fillStyle = '#052'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText('은행(피하기)', sx + this.w/2, sy + 14); }
  }
}

class TD_PowerUp {
  constructor(x, y, type) { this.type = type; this.w = 24; this.h = 24; this.x = x - this.w/2; this.y = y - this.h/2; this.bob = Math.random()*Math.PI*2; }
  update(dt) { this.bob += dt * 4; }
  render(ctx) {
    const sx = Math.floor(this.x);
    const sy = Math.floor(this.y + Math.sin(this.bob)*2);
    const colorMap = { mask: '#00BFFF', umbrella: '#FF1493', boots: '#FF4500', gas_mask: '#32CD32' };
    const symMap = { mask: 'M', umbrella: 'U', boots: 'B', gas_mask: 'G' };
    ctx.save();
    ctx.shadowColor = colorMap[this.type] || '#fff'; ctx.shadowBlur = 10;
    ctx.fillStyle = colorMap[this.type] || '#fff'; ctx.fillRect(sx, sy, this.w, this.h);
    ctx.shadowBlur = 0; ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, this.w, this.h);
    ctx.fillStyle = '#FFF'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
    ctx.fillText(symMap[this.type] || '?', sx + this.w/2, sy + this.h/2 + 6);
    ctx.restore();
  }
}

class TD_Particle {
  constructor(x, y, angle, speed, life, size, color = '#888') {
    this.x = x; this.y = y; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
    this.life = life; this.maxLife = life; this.size = size; this.color = color;
  }
  update(dt, scroll) { this.life -= dt; this.x += this.vx * dt; this.y += (this.vy + scroll*0.2) * dt; }
  render(ctx) {
    if (this.life <= 0) return; const a = Math.max(0, this.life / this.maxLife);
    ctx.save(); ctx.globalAlpha = a * 0.8; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
}

class TD_Coin {
  constructor(x, y) { this.w = 14; this.h = 14; this.x = x - this.w/2; this.y = y - this.h/2; this.spin = Math.random()*Math.PI*2; this.vx = 0; this.vy = 0; }
  update(dt, scroll, player, magnetRadius=0) {
    this.spin += dt * 6;
    // magnet attraction
    if (player && magnetRadius > 0) {
      const cx = this.x + this.w/2, cy = this.y + this.h/2;
      const px = player.x + player.w/2, py = player.y + player.h/2;
      const dx = px - cx, dy = py - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < magnetRadius) {
        const ax = (dx / dist) * PF_CONFIG.TD_COIN_MAGNET_ACCEL;
        const ay = (dy / dist) * PF_CONFIG.TD_COIN_MAGNET_ACCEL;
        this.vx += ax * dt; this.vy += ay * dt;
        const sp = Math.hypot(this.vx, this.vy);
        const maxSp = PF_CONFIG.TD_COIN_MAGNET_SPEED;
        if (sp > maxSp) { this.vx = this.vx / sp * maxSp; this.vy = this.vy / sp * maxSp; }
      }
    }
    // integrate + scroll
    this.x += this.vx * dt; this.y += (this.vy + scroll) * dt;
  }
  render(ctx) {
    const sx = Math.floor(this.x); const sy = Math.floor(this.y + Math.sin(this.spin)*1.5);
    ctx.save();
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(sx + this.w/2, sy + this.h/2, this.w/2, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
}

export class TopdownGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = PF_STATE.MENU;
    this.input = new PF_Input();
    this.health = 100; this.maxHealth = 100; this.score = 0; this.iframes = 0;
    this.level = 1; this.xp = 0; this.xpToNext = PF_CONFIG.TD_XP_BASE; this.stage = 1; this.stageTime = 0; this.stageDuration = PF_CONFIG.TD_STAGE_DURATION;
    this.coins = 0;
    this.xpMul = 1.0;
    this.player = new TD_Player(PF_CONFIG.WIDTH/2 - 13, PF_CONFIG.HEIGHT*0.7);
    this.pedestrians = []; this.banks = []; this.powerUps = []; this.coinsArr = []; this.particles = [];
    this.tSpawnPed = 0; this.tSpawnBank = 0; this.tSpawnPU = 2.0; this.tSpawnCoin = 1.0; this.trailT = 0;
    this.scroll = PF_CONFIG.TD_SCROLL_SPEED;
    this.lastTime = 0; this.acc = 0; this.fixed = 1/60; this.elapsed = 0;
    this.audio = new AudioManager();
    this.profile = loadProfile();
    this.difficultyKey = getDifficulty();
    this.difficulty = this._difficultyPreset(this.difficultyKey);
    // apply audio setting
    const settings = getSettings();
    this.audio.mute(!!settings.muted);
    this.bannerStageT = 0; this.bannerLevelT = 0;
    this._bindUI(); this._updateHUD();
    this._renderOnceMenu();
    requestAnimationFrame((t) => this._loop(t));
  }
  _bindUI() {
    const resumeAudio = () => this.audio.resume();
    document.getElementById('startBtn').addEventListener('click', () => { resumeAudio(); this.start(); });
    document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
    document.getElementById('restartBtn').addEventListener('click', () => this.restart());
    document.getElementById('playAgainBtn').addEventListener('click', () => { resumeAudio(); this.restart(); this.start(); });
    const shopBtn = document.getElementById('shopBtn'); if (shopBtn) shopBtn.addEventListener('click', () => this._openShop());
    const muteBtn = document.getElementById('muteBtn'); if (muteBtn) { muteBtn.textContent = settings.muted ? '음소거 해제' : '음소거'; muteBtn.addEventListener('click', () => this._toggleMute(muteBtn)); }
    const closeShop = document.getElementById('closeShopBtn'); if (closeShop) closeShop.addEventListener('click', () => this._closeShop());
    const diffSel = document.getElementById('difficultySelect');
    if (diffSel) {
      diffSel.value = this.difficultyKey || 'normal';
      diffSel.addEventListener('change', (e) => {
        const v = e.target.value;
        this.difficultyKey = setDifficulty(v);
        this.difficulty = this._difficultyPreset(this.difficultyKey);
      });
    }
    const nameInput = document.getElementById('nameInput');
    const saveBtn = document.getElementById('saveNameBtn');
    if (nameInput) nameInput.value = this.profile.name || 'Player';
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const v = document.getElementById('nameInput').value;
      const n = updatePlayerName(v);
      this.profile.name = n; this._updateProfileUI();
    });
    this._updateProfileUI(); this._renderShop();
    window.addEventListener('keydown', resumeAudio, { once: true });
  }
  start() {
    this.state = PF_STATE.PLAYING;
    this.level = 1; this.xp = 0; this.xpToNext = PF_CONFIG.TD_XP_BASE; this.stage = 1; this.stageTime = 0; this.elapsed = 0; this.bannerStageT = 1.8; this.bannerLevelT = 0;
    this.player.statSpeedMul = 1.0; this.xpMul = 1.0;
    // apply permanent upgrades
    const st = getUpgradesState();
    const up = {}; st.items.forEach(i => up[i.key] = i.level);
    this.player.statSpeedMul *= (1 + (up.speed || 0) * 0.02);
    this.maxHealth = 100 + (up.maxhp || 0) * 10; this.health = this.maxHealth;
    const umb = (up.umbrella || 0); this.player.powerUps.umbrella.active = umb > 0; this.player.powerUps.umbrella.uses = umb;
    this.xpMul = 1 + (up.xpmul || 0) * 0.10;
    this.magnetRadius = 40 + (up.magnet || 0) * 6; // base 40px + 6px/level
    this.coins = 0; this.score = 0; this.iframes = 0;
    this.pedestrians = []; this.banks = []; this.powerUps = []; this.coinsArr = []; this.particles = [];
    this.player.x = PF_CONFIG.WIDTH/2 - 13; this.player.y = PF_CONFIG.HEIGHT*0.7; this.tSpawnPed = 0; this.tSpawnBank = 0; this.tSpawnPU = 2.0; this.tSpawnCoin = PF_CONFIG.TD_COIN_SPAWN_EVERY * 0.8;
    document.getElementById('gameOverScreen').classList.add('hidden'); const t = document.querySelector('#gameOverScreen h2'); if (t) t.textContent='게임 오버!'; this._updateHUD();
  }
  togglePause() { if (this.state === PF_STATE.PLAYING) this.state = PF_STATE.PAUSED; else if (this.state === PF_STATE.PAUSED) this.state = PF_STATE.PLAYING; }
  restart() { this.start(); }
  gameOver() {
    this.state = PF_STATE.GAME_OVER;
    document.getElementById('finalScore').textContent = Math.floor(this.score);
    // record and refresh UI
    this.profile = recordRun({ score: this.score, stage: this.stage, level: this.level, coins: this.coins, difficulty: this.difficultyKey });
    // award credits equal to coins collected
    addCredits(this.coins);
    this._updateProfileUI();
    this._renderLeaderboard(); this._renderShop();
    const last = document.getElementById('lastRunStats');
    if (last) last.textContent = `이번 판: Stage ${this.stage}, Lv.${this.level}, ${this.coins}코인, 생존 ${Math.floor(this.elapsed)}초`;
    this.audio.sfx('gameover');
    document.getElementById('gameOverScreen').classList.remove('hidden');
  }

  _updateHUD() {
    const scoreEl = document.getElementById('score');
    const healthEl = document.getElementById('health');
    const coinsEl = document.getElementById('coins');
    const levelEl = document.getElementById('level');
    const stageEl = document.getElementById('stage');
    const powEl = document.getElementById('powerups');
    if (scoreEl) scoreEl.textContent = `점수: ${Math.floor(this.score)}`;
    if (healthEl) healthEl.textContent = `체력: ${Math.ceil(this.health)}/${Math.ceil(this.maxHealth)}`;
    if (coinsEl) coinsEl.textContent = `코인: ${this.coins}`;
    if (stageEl) stageEl.textContent = `스테이지: ${this.stage}`;
    if (levelEl) levelEl.textContent = `레벨: ${this.level}`;
    if (powEl) powEl.textContent = `파워업: ${this._powerupText()}`;
    const bestEl = document.getElementById('bestScore'); if (bestEl) bestEl.textContent = this.profile?.bestScore ?? 0;
    const profCred = document.getElementById('profileCredits'); if (profCred) profCred.textContent = (this.profile?.credits ?? loadProfile().credits) || 0;
    // progress bars
    const xpPct = Math.max(0, Math.min(1, (this.xp || 0) / (this.xpToNext || 1)));
    const xpBar = document.getElementById('xpBar'); if (xpBar) xpBar.style.width = `${Math.floor(xpPct * 100)}%`;
    const stagePct = Math.max(0, Math.min(1, (this.stageTime || 0) / (this.stageDuration || 1)));
    const stBar = document.getElementById('stageBar'); if (stBar) stBar.style.width = `${Math.floor(stagePct * 100)}%`;
  }

  _powerupText() {
    const p = this.player.powerUps; const parts = [];
    if (p.umbrella.uses > 0) parts.push(`U×${p.umbrella.uses}`);
    if (p.boots.active) parts.push(`B ${Math.ceil(p.boots.timer/1000)}s`);
    if (p.mask.active) parts.push(`M ${Math.ceil(p.mask.timer/1000)}s`);
    if (p.gas_mask.active) parts.push(`G ${Math.ceil(p.gas_mask.timer/1000)}s`);
    return parts.length ? parts.join(' | ') : '-';
  }

  _loop(current) {
    const now = current / 1000; let dt = this.lastTime ? now - this.lastTime : 0; if (dt > 0.25) dt = 0.25; this.lastTime = now; this.acc += dt;
    while (this.acc >= this.fixed) { this._update(this.fixed); this.input.resetJusts(); this.acc -= this.fixed; }
    this._render(); requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    if (this.state !== PF_STATE.PLAYING) return;
    this.elapsed += dt; this.stageTime += dt;
    if (this.bannerStageT > 0) this.bannerStageT = Math.max(0, this.bannerStageT - dt);
    if (this.bannerLevelT > 0) this.bannerLevelT = Math.max(0, this.bannerLevelT - dt);
    // stage advance
    if (this.stageTime >= this.stageDuration) {
      this.stage += 1; this.stageTime = 0; this.bannerStageT = 1.8; this.coins += 10; this._spawnStageBurst();
    }
    // difficulty scaling by time + stage (tuned)
    const stageMul = 1 + (this.stage - 1) * PF_CONFIG.TD_DIFFICULTY_STAGE_STEP;
    const timeMul = 1 + Math.min(PF_CONFIG.TD_DIFFICULTY_TIME_CAP, this.stageTime * PF_CONFIG.TD_DIFFICULTY_TIME_RATE);
    const diff = stageMul * timeMul * (this.difficulty?.hazardScale || 1);
    this.scroll = PF_CONFIG.TD_SCROLL_SPEED * (this.difficulty?.scrollScale || 1) * (stageMul * timeMul);
    // score + xp over time
    this.score += this.scroll * dt * 0.1 * (this.difficulty?.scoreMul || 1);
    this._gainXP(PF_CONFIG.TD_XP_PER_SEC * dt);
    // update player
    const wasAir = this.player.isAirborne();
    this.player.update(dt, this.input);
    this.player.updatePowerUpTimers(dt);
    // jump FX
    if (this.player.consumeJustJump()) { this._spawnJumpBurst(); this.audio.sfx('jump'); }
    if (!wasAir && this.player.isAirborne()) this.trailT = 0; // start trail
    if (this.player.isAirborne()) { this.trailT -= dt; if (this.trailT <= 0) { this._spawnTrail(); this.trailT = 0.06; } }
    if (this.player.consumeJustLand()) { this._spawnLandBurst(); this.audio.sfx('land'); }
    // spawn
    this.tSpawnPed -= dt; this.tSpawnBank -= dt; this.tSpawnCoin -= dt;
    if (this.tSpawnPed <= 0) { this._spawnPed();
      const pedBase = PF_CONFIG.TD_SPAWN_PEDESTRIAN_EVERY;
      const pedInt = Math.max(0.35, pedBase / diff) * (0.7 + Math.random()*0.6);
      this.tSpawnPed = pedInt;
    }
    if (this.tSpawnBank <= 0) { this._spawnBank();
      const bankBase = PF_CONFIG.TD_SPAWN_BANK_EVERY;
      const bankInt = Math.max(0.7, bankBase / diff) * (0.8 + Math.random()*0.7);
      this.tSpawnBank = bankInt;
    }
    if (this.tSpawnCoin <= 0) { this._spawnCoin(); this.tSpawnCoin = Math.max(1.6, (PF_CONFIG.TD_COIN_SPAWN_EVERY / (this.difficulty?.coinScale || 1)) / Math.sqrt(diff)) * (0.9 + Math.random()*0.4); }
    this.tSpawnPU -= dt; if (this.tSpawnPU <= 0) { this._spawnPowerUp(); this.tSpawnPU = 6 + Math.random()*4; }
    // move objs
    for (const p of this.pedestrians) p.update(dt, this.scroll);
    for (const b of this.banks) b.update(dt, this.scroll * 0.85);
    for (const pu of this.powerUps) pu.update(dt);
    for (const c of this.coinsArr) c.update(dt, this.scroll, this.player, this.magnetRadius || 0);
    // particles
    for (const pr of this.particles) pr.update(dt, this.scroll);
    // cull
    this.pedestrians = this.pedestrians.filter(p => p.y < PF_CONFIG.HEIGHT + 60);
    this.banks = this.banks.filter(b => b.y < PF_CONFIG.HEIGHT + 10);
    this.powerUps = this.powerUps.filter(p => p.y < PF_CONFIG.HEIGHT + 40);
    this.coinsArr = this.coinsArr.filter(c => c.y < PF_CONFIG.HEIGHT + 20);
    this.particles = this.particles.filter(p => p.life > 0);
    // collisions
    if (this.iframes > 0) this.iframes = Math.max(0, this.iframes - dt);
    // banks (skip when airborne); mask/gas_mask 적용
    if (this.iframes <= 0 && !this.player.isAirborne()) {
      for (const b of this.banks) {
        if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, b.x, b.y, b.w, b.h)) {
          let dmg = 20;
          if (this.player.powerUps.gas_mask.active) dmg = 0;
          else if (this.player.powerUps.mask.active) dmg = Math.ceil(dmg * 0.4);
          if (dmg > 0) { this._damage(dmg); this.audio.sfx('hurt'); }
          this.iframes = 0.6; break;
        }
      }
    }
    // pedestrians (jump로 회피 불가)
    if (this.iframes <= 0) {
      for (const p of this.pedestrians) {
        if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, p.x, p.y, p.w, p.h)) { this._damage(25); this.audio.sfx('hurt'); this.iframes = 0.6; break; }
      }
    }
    // powerups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, pu.x, pu.y, pu.w, pu.h)) {
        this.player.applyPowerUp(pu.type); this.powerUps.splice(i, 1); this.score += 20; this.audio.sfx('powerup'); this._updateHUD();
      }
    }
    // coins
    for (let i = this.coinsArr.length - 1; i >= 0; i--) {
      const c = this.coinsArr[i];
      if (aabb(this.player.x, this.player.y, this.player.w, this.player.h, c.x, c.y, c.w, c.h)) {
        this.coins += 1; this._gainXP(PF_CONFIG.TD_XP_PER_COIN); this.score += 5; this.coinsArr.splice(i, 1); this.audio.sfx('powerup');
      }
    }
    // end
    this._updateHUD();
  }

  _damage(amount) {
    // umbrella shield
    if (this.player.powerUps.umbrella.active && this.player.powerUps.umbrella.uses > 0) {
      this.player.powerUps.umbrella.uses -= 1;
      if (this.player.powerUps.umbrella.uses <= 0) this.player.powerUps.umbrella.active = false;
      this.iframes = Math.max(this.iframes, 0.4); return;
    }
    this.health = Math.max(0, this.health - amount); if (this.health <= 0) this.gameOver();
  }

  _gainXP(n) {
    this.xp += n * (this.xpMul || 1);
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext; this.level += 1; this.bannerLevelT = 1.4; this.player.statSpeedMul *= 1.03; this.maxHealth += 10; this.health = Math.min(this.maxHealth, this.health + 10);
      this.xpToNext = Math.floor(PF_CONFIG.TD_XP_BASE * Math.pow(PF_CONFIG.TD_XP_GROWTH, this.level - 1));
    }
  }

  _spawnPed() {
    const laneW = PF_CONFIG.WIDTH - 120; const x0 = 60; // keep sidewalks
    const group = Math.random() < 0.35; // 35% chance to spawn group
    if (group) {
      const count = 3 + Math.floor(Math.random()*3); // 3-5
      const baseX = x0 + Math.random() * (laneW - 24);
      for (let i = 0; i < count; i++) {
        const xi = Math.max(x0, Math.min(x0 + laneW - 24, baseX + (i - (count-1)/2) * 26));
        const beh = Math.random() < 0.5 ? 'zigzag' : 'straight';
        const p = new TD_Pedestrian(xi, -28 - i*18, beh);
        // slightly vary speed for group spread
        p.speed *= 0.9 + Math.random()*0.2;
        this.pedestrians.push(p);
      }
    } else {
      const x = x0 + Math.random() * (laneW - 24);
      const beh = Math.random() < 0.35 ? 'zigzag' : 'straight';
      this.pedestrians.push(new TD_Pedestrian(x, -28, beh));
    }
  }
  _spawnBank() {
    const margin = 60; const maxW = PF_CONFIG.WIDTH - margin*2; const w = 80 + Math.random() * (maxW - 80);
    const x = margin + Math.random() * (PF_CONFIG.WIDTH - margin*2 - w);
    const h = 40 + Math.random() * 60;
    this.banks.push(new TD_BankZone(x, w, h));
  }

  _spawnPowerUp() {
    const types = ['boots', 'mask', 'gas_mask', 'umbrella'];
    const type = types[Math.floor(Math.random()*types.length)];
    const x = 60 + Math.random() * (PF_CONFIG.WIDTH - 120);
    const y = -20;
    this.powerUps.push(new TD_PowerUp(x, y, type));
  }

  _spawnCoin() {
    const x = 60 + Math.random() * (PF_CONFIG.WIDTH - 120);
    const y = -12;
    this.coinsArr.push(new TD_Coin(x, y));
  }

  _spawnJumpBurst() {
    const cx = this.player.x + this.player.w/2; const cy = this.player.y + this.player.h - 4;
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI*2) * (i/10) + Math.random()*0.2;
      const s = 120 + Math.random()*80; const life = 0.35 + Math.random()*0.15; const size = 2 + Math.random()*1.5;
      this.particles.push(new TD_Particle(cx, cy, a, s, life, size, '#666'));
    }
  }
  _spawnLandBurst() {
    const cx = this.player.x + this.player.w/2; const cy = this.player.y + this.player.h - 4;
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI*2) * Math.random();
      const s = 140 + Math.random()*100; const life = 0.28 + Math.random()*0.18; const size = 2 + Math.random()*1.8;
      this.particles.push(new TD_Particle(cx, cy, a, s, life, size, '#555'));
    }
  }
  _spawnTrail() {
    const cx = this.player.x + this.player.w/2 + (Math.random()*6 - 3);
    const cy = this.player.y + this.player.h - 4;
    const a = Math.PI/2 + (Math.random()*0.6 - 0.3);
    const s = 30 + Math.random()*30; const life = 0.25 + Math.random()*0.15; const size = 1.8 + Math.random()*1.2;
    this.particles.push(new TD_Particle(cx, cy, a, s, life, size, '#777'));
  }
  _spawnStageBurst() {
    const cx = PF_CONFIG.WIDTH/2; const cy = PF_CONFIG.HEIGHT*0.35;
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI*2) * Math.random();
      const s = 160 + Math.random()*120; const life = 0.4 + Math.random()*0.2; const size = 2 + Math.random()*2;
      this.particles.push(new TD_Particle(cx, cy, a, s, life, size, '#FFD700'));
    }
  }

  _drawBackground() {
    const ctx = this.ctx; const W = PF_CONFIG.WIDTH; const H = PF_CONFIG.HEIGHT;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#87CEEB'); g.addColorStop(0.7, '#FFA07A'); g.addColorStop(1, '#228B22');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // ground
    ctx.fillStyle = '#8B4513'; ctx.fillRect(0, H - 100, W, 100);
    // walkway: draw two light stripes to suggest sidewalk/road
    ctx.fillStyle = '#d9d9d9'; ctx.fillRect(50, 0, W - 100, H);
    ctx.strokeStyle = '#bcbcbc'; ctx.lineWidth = 2; ctx.strokeRect(50, 0, W - 100, H);
    // dashed center line scrolling effect
    ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 4; ctx.setLineDash([14, 14]);
    const dashOffset = (Date.now() / 30) % 28; ctx.lineDashOffset = -dashOffset;
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke(); ctx.setLineDash([]);
  }

  _renderOnceMenu() { this._drawBackground(); this.player.render(this.ctx); }

  _render() {
    this._drawBackground();
    // particles under entities
    for (const pr of this.particles) pr.render(this.ctx);
    // hazards first
    for (const b of this.banks) b.render(this.ctx);
    for (const p of this.pedestrians) p.render(this.ctx);
    for (const pu of this.powerUps) pu.render(this.ctx);
    for (const c of this.coinsArr) c.render(this.ctx);
    this.player.render(this.ctx);
    // banners
    if (this.bannerStageT > 0) {
      const a = Math.min(1, this.bannerStageT / 1.0);
      this._centerText(`스테이지 ${this.stage}`, 40, `rgba(255,255,255,${a})`, '#00000066');
    }
    if (this.bannerLevelT > 0) {
      const a = Math.min(1, this.bannerLevelT / 0.9);
      this._centerText(`레벨 업! Lv.${this.level}`, 34, `rgba(255,215,0,${a})`, '#00000066');
    }
    if (this.state === PF_STATE.PAUSED) { this._overlay('일시정지', 48); }
    else if (this.state === PF_STATE.MENU) { this._overlay('시작 버튼을 눌러주세요!', 36); }
    this.ctx.textAlign = 'left';
  }
  _overlay(text, size) { this.ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.ctx.fillRect(0,0,PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT); this.ctx.fillStyle = 'white'; this.ctx.font = `${size}px Arial`; this.ctx.textAlign = 'center'; this.ctx.fillText(text, PF_CONFIG.WIDTH/2, PF_CONFIG.HEIGHT/2); }
  _centerText(text, size, fill='white', shadow='rgba(0,0,0,0.4)') {
    this.ctx.save(); this.ctx.font = `${size}px Arial`; this.ctx.textAlign = 'center';
    this.ctx.fillStyle = shadow; this.ctx.fillText(text, PF_CONFIG.WIDTH/2+2, PF_CONFIG.HEIGHT*0.3+2);
    this.ctx.fillStyle = fill; this.ctx.fillText(text, PF_CONFIG.WIDTH/2, PF_CONFIG.HEIGHT*0.3);
    this.ctx.restore();
  }

  _renderLeaderboard() {
    const list = document.getElementById('leaderboardList'); if (!list) return;
    const p = this.profile || loadProfile();
    const fmtDate = (ms) => { try { const d = new Date(ms); return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`; } catch (_) { return ''; } };
    list.innerHTML = '';
    (p.leaderboard || []).forEach((r) => {
      const li = document.createElement('li');
      const diff = (r.difficulty || 'normal');
      const diffLabel = diff === 'easy' ? '쉬움' : diff === 'hard' ? '어려움' : diff === 'insane' ? '미친' : '보통';
      li.textContent = `${p.name} — ${r.score}점, Stage ${r.stage}, Lv.${r.level}, ${r.coins}코인, ${diffLabel} • ${fmtDate(r.date)}`;
      list.appendChild(li);
    });
  }
  _updateProfileUI() {
    const bestEl = document.getElementById('bestScore'); if (bestEl) bestEl.textContent = this.profile?.bestScore ?? 0;
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.textContent = this.profile?.name ?? 'Player';
    const creditsEl = document.getElementById('credits'); if (creditsEl) creditsEl.textContent = (this.profile?.credits ?? loadProfile().credits) || 0;
    const creditsEl2 = document.getElementById('creditsShop'); if (creditsEl2) creditsEl2.textContent = (this.profile?.credits ?? loadProfile().credits) || 0;
  }

  _renderShop() {
    const renderInto = (wrapId, creditsId) => {
      const wrap = document.getElementById(wrapId); if (!wrap) return;
      wrap.innerHTML = '';
      const st = getUpgradesState();
      const creditsEl = document.getElementById(creditsId); if (creditsEl) creditsEl.textContent = st.credits || 0;
      st.items.forEach(it => {
        const row = document.createElement('div'); row.className = 'shop-item';
        const info = document.createElement('div'); info.className = 'info';
        const title = document.createElement('div'); title.className = 'title'; title.textContent = `${it.title} (Lv.${it.level}/${it.max})`;
        const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = it.desc;
        const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = it.level >= it.max ? '최대 레벨' : `가격: ${it.cost} 크레딧`;
        info.appendChild(title); info.appendChild(desc); info.appendChild(meta);
        const btn = document.createElement('button');
        btn.textContent = it.level >= it.max ? '구매 불가' : `구매`;
        btn.disabled = it.level >= it.max || (st.credits || 0) < it.cost;
        btn.addEventListener('click', () => {
          const res = purchaseUpgrade(it.key);
          if (res.ok) { this.profile = res.profile; this._updateProfileUI(); this._renderShop(); }
        });
        row.appendChild(info); row.appendChild(btn); wrap.appendChild(row);
      });
    };
    renderInto('shopItems', 'credits');
    renderInto('shopItemsShop', 'creditsShop');
  }

  _openShop() {
    const el = document.getElementById('shopOverlay'); if (!el) return;
    // Pause if currently playing
    if (this.state === PF_STATE.PLAYING) this.state = PF_STATE.PAUSED;
    this._renderShop();
    el.classList.remove('hidden');
  }
  _closeShop() {
    const el = document.getElementById('shopOverlay'); if (!el) return;
    el.classList.add('hidden');
  }

  _difficultyPreset(key) {
    switch (key) {
      case 'easy': return { key, hazardScale: 0.85, scrollScale: 0.9, coinScale: 1.1, scoreMul: 0.85 };
      case 'hard': return { key, hazardScale: 1.2, scrollScale: 1.15, coinScale: 0.95, scoreMul: 1.2 };
      case 'insane': return { key, hazardScale: 1.45, scrollScale: 1.3, coinScale: 0.9, scoreMul: 1.5 };
      case 'normal':
      default: return { key: 'normal', hazardScale: 1.0, scrollScale: 1.0, coinScale: 1.0, scoreMul: 1.0 };
    }
  }

  _toggleMute(btn) {
    const newMuted = !(getSettings().muted);
    setMuted(newMuted); this.audio.mute(newMuted);
    if (btn) btn.textContent = newMuted ? '음소거 해제' : '음소거';
  }
}
