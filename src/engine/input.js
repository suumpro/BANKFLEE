export class PF_Input {
  constructor() {
    this.down = new Set();
    this.justDown = new Set();
    this.justUp = new Set();

    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.down.has(k)) this.justDown.add(k);
      this.down.add(k);
      if (e.key === ' ') e.preventDefault();
    });
    document.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (this.down.has(k)) this.justUp.add(k);
      this.down.delete(k);
    });
  }
  isDown(k) { return this.down.has(k); }
  isLeft() { return this.isDown('arrowleft') || this.isDown('a'); }
  isRight() { return this.isDown('arrowright') || this.isDown('d'); }
  jumpDown() { return this.justDown.has(' ') || this.justDown.has('w') || this.justDown.has('arrowup'); }
  jumpUp() { return this.justUp.has(' ') || this.justUp.has('w') || this.justUp.has('arrowup'); }
  resetJusts() { this.justDown.clear(); this.justUp.clear(); }
}

