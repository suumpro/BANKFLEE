import { PF_CONFIG } from './constants.js';

export class PF_Player {
  constructor(x, y) {
    this.w = 26; this.h = 30; this.x = x; this.y = y;
    this.vx = 0; this.vy = 0; this.onGround = false;
    this.coyote = 0; this.jumpBuf = 0; this.color = '#FF6B35';
    this.powerUps = {
      mask: { active: false, timer: 0 },
      gas_mask: { active: false, timer: 0 },
      boots: { active: false, timer: 0 },
      umbrella: { active: false, uses: 0 }
    };
  }
  update(dt, input, map) {
    const left = input.isLeft(); const right = input.isRight();
    const want = (left ? -1 : 0) + (right ? 1 : 0);
    if (input.jumpDown()) this.jumpBuf = PF_CONFIG.JUMP_BUFFER;
    const accel = PF_CONFIG.RUN_ACCEL * (this.powerUps.boots.active ? 1.2 : 1.0);
    const maxRun = PF_CONFIG.MAX_RUN_SPEED * (this.powerUps.boots.active ? 1.25 : 1.0);
    if (want !== 0) this.vx += want * accel * dt;
    else {
      const fric = (this.onGround ? PF_CONFIG.RUN_FRICTION : PF_CONFIG.AIR_FRICTION) * dt;
      if (Math.abs(this.vx) <= fric) this.vx = 0; else this.vx -= Math.sign(this.vx) * fric;
    }
    this.vx = Math.max(-maxRun, Math.min(maxRun, this.vx));
    const jumpSpeed = PF_CONFIG.JUMP_SPEED * (this.powerUps.boots.active ? 1.12 : 1.0);
    if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0)) {
      this.vy = -jumpSpeed; this.onGround = false; this.coyote = 0; this.jumpBuf = 0;
    }
    if (input.jumpUp() && this.vy < 0) this.vy *= 0.5;
    this.vy += PF_CONFIG.GRAVITY * dt;
    this._moveAxis(dt, map, true);
    this._moveAxis(dt, map, false);
    this.coyote = this.onGround ? PF_CONFIG.COYOTE_TIME : Math.max(0, this.coyote - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.updatePowerUpTimers(dt);
  }
  _moveAxis(dt, map, isX) {
    const ts = map.tileSize; const half = 0.001;
    let nx = this.x + (isX ? this.vx * dt : 0);
    let ny = this.y + (!isX ? this.vy * dt : 0);
    if (isX) {
      if (this.vx > 0) {
        const right = Math.floor((nx + this.w) / ts);
        const top = Math.floor(this.y / ts);
        const bottom = Math.floor((this.y + this.h - half) / ts);
        for (let ty = top; ty <= bottom; ty++) if (map.isSolidTile(right, ty)) { nx = right * ts - this.w; this.vx = 0; break; }
      } else if (this.vx < 0) {
        const left = Math.floor(nx / ts);
        const top = Math.floor(this.y / ts);
        const bottom = Math.floor((this.y + this.h - half) / ts);
        for (let ty = top; ty <= bottom; ty++) if (map.isSolidTile(left, ty)) { nx = (left + 1) * ts; this.vx = 0; break; }
      }
      this.x = nx;
    } else {
      this.onGround = false;
      if (this.vy > 0) {
        const bottom = Math.floor((ny + this.h) / ts);
        const left = Math.floor(this.x / ts);
        const right = Math.floor((this.x + this.w - 0.001) / ts);
        for (let tx = left; tx <= right; tx++) if (map.isSolidTile(tx, bottom)) { ny = bottom * ts - this.h; this.vy = 0; this.onGround = true; break; }
      } else if (this.vy < 0) {
        const top = Math.floor(ny / ts);
        const left = Math.floor(this.x / ts);
        const right = Math.floor((this.x + this.w - 0.001) / ts);
        for (let tx = left; tx <= right; tx++) if (map.isSolidTile(tx, top)) { ny = (top + 1) * ts; this.vy = 0; break; }
      }
      this.y = ny;
    }
  }
  render(ctx, camera) {
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.floor(this.x - camera.x), Math.floor(this.y - camera.y), this.w, this.h);
    ctx.fillStyle = '#333';
    ctx.fillRect(Math.floor(this.x - camera.x + 6), Math.floor(this.y - camera.y + 6), 4, 4);
    ctx.fillRect(Math.floor(this.x - camera.x + 16), Math.floor(this.y - camera.y + 6), 4, 4);
  }
  applyPowerUp(type) {
    switch (type) {
      case 'mask': this.powerUps.mask.active = true; this.powerUps.mask.timer = 10000; break;
      case 'gas_mask': this.powerUps.gas_mask.active = true; this.powerUps.gas_mask.timer = 20000; break;
      case 'boots': this.powerUps.boots.active = true; this.powerUps.boots.timer = 15000; break;
      case 'umbrella': this.powerUps.umbrella.active = true; this.powerUps.umbrella.uses += 1; break;
    }
  }
  updatePowerUpTimers(dt) {
    const dms = dt * 1000;
    if (this.powerUps.mask.active) { this.powerUps.mask.timer -= dms; if (this.powerUps.mask.timer <= 0) this.powerUps.mask.active = false; }
    if (this.powerUps.gas_mask.active) { this.powerUps.gas_mask.timer -= dms; if (this.powerUps.gas_mask.timer <= 0) this.powerUps.gas_mask.active = false; }
    if (this.powerUps.boots.active) { this.powerUps.boots.timer -= dms; if (this.powerUps.boots.timer <= 0) this.powerUps.boots.active = false; }
  }
}

