import { BPM_OPTIONS } from './constants.js';
import { settings } from './settings.js';

export class AudioBeat {
  constructor() {
    this.ctx = null;
    this.nextBeatTime = 0;
    this.onBeat = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.nextBeatTime = this.ctx.currentTime;
  }

  kick() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.28);
  }

  update() {
    if (!this.ctx || !settings.beatOn) return false;
    const bpm = BPM_OPTIONS[settings.bpmIndex];
    const interval = 60 / bpm;
    if (this.ctx.currentTime >= this.nextBeatTime) {
      this.kick();
      this.nextBeatTime += interval;
      return true;
    }
    return false;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
