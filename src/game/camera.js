export class PF_Camera {
  constructor(viewW, viewH, map) {
    this.w = viewW;
    this.h = viewH;
    this.map = map;
    this.x = 0;
    this.y = 0;
    this.deadZoneX = viewW * 0.35;
  }
  follow(px, py) {
    const targetX = px - this.deadZoneX;
    this.x = Math.max(0, Math.min(targetX, this.map.width * this.map.tileSize - this.w));
    this.y = 0;
  }
}

