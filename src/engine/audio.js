export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }
  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2; // master volume
      this.master.connect(this.ctx.destination);
    }
  }
  async resume() { try { this._ensure(); if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume(); } catch (_) {} }
  mute(v) { this.enabled = !v; if (this.master) this.master.gain.value = v ? 0.0 : 0.2; }
  sfx(name) {
    if (!this.enabled) return;
    this._ensure(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const playBeep = (freq, dur=0.08, type='sine', vol=0.6) => {
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t+0.005); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
      o.connect(g).connect(this.master); o.start(t); o.stop(t+dur+0.01);
    };
    switch (name) {
      case 'jump': playBeep(520, 0.09, 'triangle', 0.5); break;
      case 'land': playBeep(180, 0.06, 'sine', 0.4); break;
      case 'powerup': playBeep(740, 0.06, 'square', 0.35); setTimeout(()=>playBeep(880, 0.07, 'square', 0.3), 50); break;
      case 'hurt': playBeep(220, 0.12, 'sawtooth', 0.4); break;
      case 'gameover': playBeep(330, 0.18, 'sawtooth', 0.4); setTimeout(()=>playBeep(220, 0.22, 'triangle', 0.35), 120); break;
      default: break;
    }
  }
}

