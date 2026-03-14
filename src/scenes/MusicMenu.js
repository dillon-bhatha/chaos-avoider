import Phaser from 'phaser';
import { W, H, GRID_SIZE, BPM_OPTIONS } from '../constants.js';
import { settings } from '../settings.js';

export class MusicMenu extends Phaser.Scene {
  constructor() { super('MusicMenu'); }

  create() {
    this.menuIndex = 0;
    this.gfx = this.add.graphics();
    this.gridOffset = 0;
    this.built = false;

    this.input.keyboard.on('keydown', (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.menuIndex = (this.menuIndex - 1 + 2) % 2;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.menuIndex = (this.menuIndex + 1) % 2;
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space' || e.code === 'Enter') {
        if (this.menuIndex === 0) {
          settings.beatOn = !settings.beatOn;
        } else {
          settings.bpmIndex = (settings.bpmIndex + 1) % BPM_OPTIONS.length;
        }
        this.updateLabels();
      } else if (e.code === 'Escape') {
        this.scene.start('MainMenu');
      }
    });
  }

  update() {
    this.gridOffset = (this.gridOffset + 0.5) % GRID_SIZE;
    this.drawBg();
    if (!this.built) this.buildUI();
    this.updateSelection();
  }

  drawBg() {
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x0a0a1a);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1, 0x00ffff, 0.07);
    for (let x = -GRID_SIZE + (this.gridOffset % GRID_SIZE); x < W + GRID_SIZE; x += GRID_SIZE) {
      g.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y < H + GRID_SIZE; y += GRID_SIZE) {
      g.lineBetween(0, y, W, y);
    }
  }

  buildUI() {
    this.built = true;

    this.add.text(W / 2, 80, 'MUSIC SETTINGS', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffaa00',
      shadow: { color: '#ffaa00', blur: 16, fill: true },
    }).setOrigin(0.5);

    this.beatLabel = this.add.text(W / 2 - 120, 200, 'Beat', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0, 0.5);
    this.beatToggle = this.add.text(W / 2 + 100, 200, settings.beatOn ? 'ON' : 'OFF', {
      fontFamily: 'monospace', fontSize: '20px',
      color: settings.beatOn ? '#00ff88' : '#ff4466',
    }).setOrigin(0.5);

    this.bpmLabel = this.add.text(W / 2 - 120, 290, 'BPM', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0, 0.5);
    this.bpmValue = this.add.text(W / 2 + 100, 290, String(BPM_OPTIONS[settings.bpmIndex]), {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffaa00',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 24, 'ESC back   ↑↓ navigate   SPACE / ← → toggle', {
      fontFamily: 'monospace', fontSize: '12px', color: '#444466',
    }).setOrigin(0.5);

    this.selBox = this.add.graphics();
  }

  updateLabels() {
    this.beatToggle.setText(settings.beatOn ? 'ON' : 'OFF');
    this.beatToggle.setStyle({ color: settings.beatOn ? '#00ff88' : '#ff4466' });
    this.bpmValue.setText(String(BPM_OPTIONS[settings.bpmIndex]));
  }

  updateSelection() {
    this.selBox.clear();
    const ys = [200, 290];
    const y = ys[this.menuIndex];
    this.selBox.lineStyle(2, 0xffaa00, 0.8);
    this.selBox.strokeRect(W / 2 - 180, y - 26, 360, 52);
    this.selBox.fillStyle(0xffaa00, 0.04);
    this.selBox.fillRect(W / 2 - 180, y - 26, 360, 52);

    this.beatLabel.setStyle({ color: this.menuIndex === 0 ? '#ffaa00' : '#ffffff' });
    this.bpmLabel.setStyle({ color: this.menuIndex === 1 ? '#ffaa00' : '#ffffff' });
  }
}
