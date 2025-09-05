import { PF_CONFIG, PF_ENEMY } from './constants.js';

export class PF_Coin {
  constructor(x, y) {
    this.w = 16; this.h = 16;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.collected = false;
  }
  render(ctx, camera) {
    const sx = Math.floor(this.x - camera.x);
    const sy = Math.floor(this.y - camera.y);
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(sx + this.w/2, sy + this.h/2, this.w/2, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
}

export class PF_PowerUp {
  constructor(x, y, type) {
    this.type = type;
    this.w = 24; this.h = 24;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.bob = Math.random() * Math.PI * 2;
  }
  update(dt) { this.bob += dt * 4; }
  render(ctx, camera) {
    const sx = Math.floor(this.x - camera.x);
    const sy = Math.floor(this.y - camera.y + Math.sin(this.bob) * 2);
    const colorMap = { mask: '#00BFFF', umbrella: '#FF1493', boots: '#FF4500', gas_mask: '#32CD32' };
    const symMap = { mask: 'M', umbrella: 'U', boots: 'B', gas_mask: 'G' };
    ctx.save();
    ctx.shadowColor = colorMap[this.type] || '#fff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = colorMap[this.type] || '#fff';
    ctx.fillRect(sx, sy, this.w, this.h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, this.w, this.h);
    ctx.fillStyle = '#FFF'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
    ctx.fillText(symMap[this.type] || '?', sx + this.w/2, sy + this.h/2 + 6);
    ctx.restore();
  }
}

export class PF_Goal {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; }
  render(ctx, camera) {
    const sx = Math.floor(this.x - camera.x);
    const sy = Math.floor(this.y - camera.y);
    ctx.save();
    ctx.fillStyle = '#654321';
    ctx.fillRect(sx + this.w - 6, sy, 6, this.h + 8);
    ctx.fillStyle = '#FF3B3B';
    ctx.beginPath();
    ctx.moveTo(sx + this.w - 6, sy + 6);
    ctx.lineTo(sx + this.w - 6 - this.w * 0.8, sy + 14);
    ctx.lineTo(sx + this.w - 6, sy + 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export class PF_Enemy {
  constructor(x, y, w = 24, h = 24) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.onGround = false; this.alive = true; this.color = '#C23B22';
  }
  update(dt, map) {}
  render(ctx, camera) {
    if (!this.alive) return;
    const sx = Math.floor(this.x - camera.x);
    const sy = Math.floor(this.y - camera.y);
    ctx.fillStyle = this.color; ctx.fillRect(sx, sy, this.w, this.h);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, this.w, this.h);
  }
}

export class PF_PatrolEnemy extends PF_Enemy {
  constructor(x, y, rangePx = 200, dir = 1) {
    super(x, y, 24, 24);
    this.speed = PF_ENEMY.WALK_SPEED;
    this.dir = Math.sign(dir) || 1;
    this.minX = x - rangePx;
    this.maxX = x + rangePx;
  }
  update(dt, map) {
    if (!this.alive) return;
    this.vx = this.dir * this.speed;
    this.vy += PF_ENEMY.GRAVITY * dt;
    this._moveAxis(dt, map, true);
    this._moveAxis(dt, map, false);
    if (this.x < this.minX) { this.x = this.minX; this.dir = 1; }
    if (this.x + this.w > this.maxX) { this.x = this.maxX - this.w; this.dir = -1; }
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
        for (let ty = top; ty <= bottom; ty++) {
          if (map.isSolidTile(right, ty)) { nx = right * ts - this.w; this.dir = -1; break; }
        }
      } else if (this.vx < 0) {
        const left = Math.floor(nx / ts);
        const top = Math.floor(this.y / ts);
        const bottom = Math.floor((this.y + this.h - half) / ts);
        for (let ty = top; ty <= bottom; ty++) {
          if (map.isSolidTile(left, ty)) { nx = (left + 1) * ts; this.dir = 1; break; }
        }
      }
      this.x = nx;
    } else {
      this.onGround = false;
      if (this.vy > 0) {
        const bottom = Math.floor((ny + this.h) / ts);
        const left = Math.floor(this.x / ts);
        const right = Math.floor((this.x + this.w - half) / ts);
        for (let tx = left; tx <= right; tx++) {
          if (map.isSolidTile(tx, bottom)) { ny = bottom * ts - this.h; this.vy = 0; this.onGround = true; break; }
        }
      } else if (this.vy < 0) {
        const top = Math.floor(ny / ts);
        const left = Math.floor(this.x / ts);
        const right = Math.floor((this.x + this.w - half) / ts);
        for (let tx = left; tx <= right; tx++) {
          if (map.isSolidTile(tx, top)) { ny = (top + 1) * ts; this.vy = 0; break; }
        }
      }
      this.y = ny;
    }
  }
  render(ctx, camera) {
    this.color = '#8B0000';
    super.render(ctx, camera);
    const sx = Math.floor(this.x - camera.x);
    const sy = Math.floor(this.y - camera.y);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(sx + 6, sy + 6, 4, 4);
    ctx.fillRect(sx + this.w - 10, sy + 6, 4, 4);
  }
}

