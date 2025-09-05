import { PF_CONFIG } from './constants.js';

export class PF_TileMap {
  constructor(data) {
    this.tileSize = data.tileSize || PF_CONFIG.TILE;
    this.width = data.width;  // in tiles
    this.height = data.height; // in tiles
    this.solids = data.layers?.solids || [];
    this.hazards = data.layers?.hazards || [];

    if (!this.solids || this.solids.length === 0) {
      this._buildDefaultGround();
    }
  }

  _emptyGrid() {
    const g = new Array(this.height);
    for (let y = 0; y < this.height; y++) g[y] = new Array(this.width).fill(0);
    return g;
  }

  _buildDefaultGround() {
    this.solids = this._emptyGrid();
    for (let y = this.height - 3; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) this.solids[y][x] = 1;
    }
    const plats = [
      { x: 8, y: 12, w: 6 },
      { x: 22, y: 10, w: 4 },
      { x: 35, y: 8, w: 5 },
      { x: 48, y: 12, w: 6 },
      { x: 66, y: 9, w: 5 },
      { x: 80, y: 11, w: 7 },
      { x: 96, y: 10, w: 5 }
    ];
    plats.forEach(p => {
      for (let i = 0; i < p.w; i++) {
        if (p.x + i < this.width && p.y < this.height) this.solids[p.y][p.x + i] = 1;
      }
    });
  }

  isSolidTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return true;
    return this.solids[ty]?.[tx] === 1;
  }

  render(ctx, camera) {
    const ts = this.tileSize;
    const startX = Math.max(0, Math.floor(camera.x / ts) - 1);
    const endX = Math.min(this.width, Math.ceil((camera.x + camera.w) / ts) + 1);
    const startY = Math.max(0, Math.floor(camera.y / ts) - 1);
    const endY = Math.min(this.height, Math.ceil((camera.y + camera.h) / ts) + 1);

    ctx.fillStyle = '#5c7c3f';
    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        if (this.isSolidTile(tx, ty)) {
          const sx = tx * ts - camera.x;
          const sy = ty * ts - camera.y;
          ctx.fillRect(sx, sy, ts, ts);
        }
      }
    }
  }
}

