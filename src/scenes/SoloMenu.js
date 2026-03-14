import Phaser from 'phaser';
import { W, H, SOLO_FEATURES, GRID_SIZE } from '../constants.js';
import { settings } from '../settings.js';

export class SoloMenu extends Phaser.Scene {
  constructor() { super('SoloMenu'); }

  create() {
    this.menuIndex = 0;
    this.gfx = this.add.graphics();
    this.gridOffset = 0;
    this.built = false;

    this.input.keyboard.on('keydown', (e) => {
      const len = SOLO_FEATURES.length + 1;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.menuIndex = (this.menuIndex - 1 + len) % len;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.menuIndex = (this.menuIndex + 1) % len;
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (this.menuIndex < SOLO_FEATURES.length) {
          const key = SOLO_FEATURES[this.menuIndex].key;
          settings[key] = !settings[key];
          this.updateLabels();
        } else {
          this.scene.start('Game', { mode: 'solo' });
        }
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

    this.add.text(W / 2, 40, 'SOLO SETTINGS', {
      fontFamily: 'monospace', fontSize: '28px', color: '#00ffff',
      shadow: { color: '#00ffff', blur: 16, fill: true },
    }).setOrigin(0.5);

    this.featureRows = SOLO_FEATURES.map((f, i) => {
      const y = 110 + i * 54;
      const label = this.add.text(W / 2 - 160, y, f.label, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
      }).setOrigin(0, 0.5);
      const toggle = this.add.text(W / 2 + 130, y, settings[f.key] ? 'ON' : 'OFF', {
        fontFamily: 'monospace', fontSize: '18px',
        color: settings[f.key] ? '#00ff88' : '#ff4466',
      }).setOrigin(0.5);
      const desc = this.add.text(W / 2 - 160, y + 18, f.desc, {
        fontFamily: 'monospace', fontSize: '11px', color: '#555577',
      }).setOrigin(0, 0.5);
      return { label, toggle, desc };
    });

    const playY = 110 + SOLO_FEATURES.length * 54 + 20;
    this.playText = this.add.text(W / 2, playY, '▶  PLAY', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 24, 'ESC back   ↑↓ navigate   SPACE toggle / start', {
      fontFamily: 'monospace', fontSize: '12px', color: '#444466',
    }).setOrigin(0.5);

    this.selBox = this.add.graphics();
  }

  updateLabels() {
    SOLO_FEATURES.forEach((f, i) => {
      this.featureRows[i].toggle.setText(settings[f.key] ? 'ON' : 'OFF');
      this.featureRows[i].toggle.setStyle({ color: settings[f.key] ? '#00ff88' : '#ff4466' });
    });
  }

  updateSelection() {
    this.selBox.clear();
    const isPlay = this.menuIndex === SOLO_FEATURES.length;
    const y = isPlay
      ? (110 + SOLO_FEATURES.length * 54 + 20)
      : 110 + this.menuIndex * 54;
    const boxH = isPlay ? 36 : 50;
    const boxY = y - boxH / 2;
    this.selBox.lineStyle(2, 0x00ffff, 0.8);
    this.selBox.strokeRect(W / 2 - 190, boxY, 380, boxH);
    this.selBox.fillStyle(0x00ffff, 0.04);
    this.selBox.fillRect(W / 2 - 190, boxY, 380, boxH);

    this.featureRows.forEach((row, i) => {
      row.label.setStyle({ color: i === this.menuIndex ? '#00ffff' : '#ffffff' });
    });
    this.playText.setStyle({ color: isPlay ? '#00ffff' : '#ffffff' });
  }
}
