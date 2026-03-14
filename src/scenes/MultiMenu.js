import Phaser from 'phaser';
import { W, H, GRID_SIZE } from '../constants.js';

export class MultiMenu extends Phaser.Scene {
  constructor() { super('MultiMenu'); }

  create() {
    this.menuIndex = 0;
    this.gfx = this.add.graphics();
    this.gridOffset = 0;
    this.built = false;
    this.linkCopied = false;
    this.linkCopiedTimer = 0;

    this.input.keyboard.on('keydown', (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.menuIndex = (this.menuIndex - 1 + 4) % 4;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.menuIndex = (this.menuIndex + 1) % 4;
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (this.menuIndex === 0) {
          this.scene.start('Game', { mode: 'multi' });
        } else if (this.menuIndex === 1) {
          this.scene.start('Game', { mode: 'versus' });
        } else if (this.menuIndex === 2) {
          this.shareWhatsApp();
        } else if (this.menuIndex === 3) {
          this.copyLink();
        }
      } else if (e.code === 'Escape') {
        this.scene.start('MainMenu');
      }
    });
  }

  shareWhatsApp() {
    const msg = encodeURIComponent(`🎮 Chaos Avoider – try to beat my score! Play here: ${window.location.href}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  copyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.linkCopied = true;
        this.linkCopiedTimer = 150;
      });
    }
  }

  update() {
    this.gridOffset = (this.gridOffset + 0.5) % GRID_SIZE;
    this.drawBg();
    if (!this.built) this.buildUI();
    this.updateSelection();

    if (this.linkCopiedTimer > 0) {
      this.linkCopiedTimer--;
      if (this.linkCopiedTimer === 0) {
        this.linkCopied = false;
        this.copyText.setText('Copy Link');
      }
    }
    if (this.linkCopied && this.copyText) {
      this.copyText.setText('Copied!');
    }
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

    this.add.text(W / 2, 44, 'LOCAL MULTIPLAYER', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ff44ff',
      shadow: { color: '#ff44ff', blur: 16, fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 80, 'Two players · same keyboard · WASD vs Arrows', {
      fontFamily: 'monospace', fontSize: '12px', color: '#666688',
    }).setOrigin(0.5);

    this.coopText = this.add.text(W / 2, 158, '▶  CO-OP', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(W / 2, 180, 'Survive together', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555577',
    }).setOrigin(0.5);

    this.vsText = this.add.text(W / 2, 238, '▶  VERSUS', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(W / 2, 260, 'First to die loses', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555577',
    }).setOrigin(0.5);

    this.waText = this.add.text(W / 2, 320, 'WhatsApp Invite', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(W / 2, 342, 'Share a link via WhatsApp', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555577',
    }).setOrigin(0.5);

    this.copyText = this.add.text(W / 2, 395, 'Copy Link', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(W / 2, 417, 'Copy the game URL to clipboard', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555577',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 24, 'ESC back   ↑↓ navigate   SPACE select', {
      fontFamily: 'monospace', fontSize: '12px', color: '#444466',
    }).setOrigin(0.5);

    this.selBox = this.add.graphics();
  }

  updateSelection() {
    this.selBox.clear();
    const ys = [158, 238, 324, 398];
    const y = ys[this.menuIndex];
    this.selBox.lineStyle(2, 0xff44ff, 0.8);
    this.selBox.strokeRect(W / 2 - 190, y - 26, 380, 52);
    this.selBox.fillStyle(0xff44ff, 0.04);
    this.selBox.fillRect(W / 2 - 190, y - 26, 380, 52);

    this.coopText.setStyle({ color: this.menuIndex === 0 ? '#ff44ff' : '#ffffff' });
    this.vsText.setStyle({ color: this.menuIndex === 1 ? '#ff44ff' : '#ffffff' });
    this.waText.setStyle({ color: this.menuIndex === 2 ? '#ff44ff' : '#ffffff' });
    this.copyText.setStyle({ color: this.menuIndex === 3 ? '#ff44ff' : '#ffffff' });
  }
}
