import Phaser from 'phaser';
import { W, H, GRID_SIZE } from '../constants.js';

export class MultiMenu extends Phaser.Scene {
  constructor() { super('MultiMenu'); }

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
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (this.menuIndex === 0) this.scene.start('Game', { mode: 'multi' });
        else this.scene.start('Game', { mode: 'versus' });
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

    this.add.text(W / 2, 80, 'LOCAL MULTIPLAYER', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ff44ff',
      shadow: { color: '#ff44ff', blur: 16, fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 116, 'Two players · same keyboard · WASD vs Arrows', {
      fontFamily: 'monospace', fontSize: '12px', color: '#666688',
    }).setOrigin(0.5);

    this.coopText = this.add.text(W / 2, 220, '▶  CO-OP', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(W / 2, 244, 'Survive together', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555577',
    }).setOrigin(0.5);

    this.vsText = this.add.text(W / 2, 316, '▶  VERSUS', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(W / 2, 340, 'First to die loses', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555577',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 24, 'ESC back   ↑↓ navigate   SPACE select', {
      fontFamily: 'monospace', fontSize: '12px', color: '#444466',
    }).setOrigin(0.5);

    this.selBox = this.add.graphics();
  }

  updateSelection() {
    this.selBox.clear();
    const ys = [220, 316];
    const y = ys[this.menuIndex];
    this.selBox.lineStyle(2, 0xff44ff, 0.8);
    this.selBox.strokeRect(W / 2 - 190, y - 28, 380, 56);
    this.selBox.fillStyle(0xff44ff, 0.04);
    this.selBox.fillRect(W / 2 - 190, y - 28, 380, 56);

    this.coopText.setStyle({ color: this.menuIndex === 0 ? '#ff44ff' : '#ffffff' });
    this.vsText.setStyle({ color: this.menuIndex === 1 ? '#ff44ff' : '#ffffff' });
  }
}
