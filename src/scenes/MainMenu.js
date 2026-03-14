import Phaser from 'phaser';
import { W, H, MAIN_ITEMS, GRID_SIZE } from '../constants.js';

export class MainMenu extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create() {
    this.menuIndex = 0;
    this.gfx = this.add.graphics();
    this.gridOffset = 0;
    this.titleText = null;
    this.itemTexts = null;

    this.input.keyboard.on('keydown', (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.menuIndex = (this.menuIndex - 1 + MAIN_ITEMS.length) % MAIN_ITEMS.length;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.menuIndex = (this.menuIndex + 1) % MAIN_ITEMS.length;
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (this.menuIndex === 0) {
          this.scene.start('SoloMenu');
        } else if (this.menuIndex === 1) {
          this.scene.start('MultiMenu');
        } else if (this.menuIndex === 2) {
          this.scene.start('OnlineMenu');
        } else if (this.menuIndex === 3) {
          this.scene.start('MusicMenu');
        }
      }
    });
  }

  update() {
    this.gridOffset = (this.gridOffset + 0.5) % GRID_SIZE;
    this.drawMenu();
  }

  drawMenu() {
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

    if (!this.titleText) {
      this.titleText = this.add.text(W / 2, 70, 'CHAOS AVOIDER', {
        fontFamily: 'monospace',
        fontSize: '42px',
        color: '#00ffff',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { color: '#00ffff', blur: 20, fill: true },
      }).setOrigin(0.5);

      this.subText = this.add.text(W / 2, 114, 'survive as long as possible', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      this.itemTexts = MAIN_ITEMS.map((item, i) => ({
        label: this.add.text(W / 2, 158 + i * 68, item.label, {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: '#ffffff',
        }).setOrigin(0.5),
        sub: this.add.text(W / 2, 180 + i * 68, item.sub, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#777777',
        }).setOrigin(0.5),
      }));

      this.hintText = this.add.text(W / 2, H - 24, '↑↓ navigate   SPACE / ENTER select', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#444466',
      }).setOrigin(0.5);
    }

    MAIN_ITEMS.forEach((_, i) => {
      const selected = i === this.menuIndex;
      this.itemTexts[i].label.setStyle({ color: selected ? '#00ffff' : '#ffffff' });
      if (selected) {
        g.lineStyle(2, 0x00ffff, 0.9);
        g.strokeRect(W / 2 - 180, 143 + i * 68, 360, 50);
        g.fillStyle(0x00ffff, 0.05);
        g.fillRect(W / 2 - 180, 143 + i * 68, 360, 50);
      }
    });
  }
}
