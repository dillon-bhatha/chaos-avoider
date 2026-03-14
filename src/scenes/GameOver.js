import Phaser from 'phaser';
import { W, H, GRID_SIZE } from '../constants.js';

export class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) {
    this.finalScore = data.score || 0;
    this.highScore = data.highScore || 0;
    this.mode = data.mode || 'solo';
    this.savedGhostRun = data.ghostRun || [];
  }

  create() {
    this.gridOffset = 0;
    this.gfx = this.add.graphics();
    this.newRecord = this.finalScore >= this.highScore && this.highScore > 0;

    const replay = () => {
      if (this.mode === 'online') this.scene.start('MainMenu');
      else this.scene.start('Game', { mode: this.mode });
    };
    this.input.keyboard.on('keydown-SPACE', replay);
    this.input.keyboard.on('keydown-R', replay);
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('MainMenu');
    });

    this.add.text(W / 2, 130, 'GAME OVER', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ff4466',
      shadow: { color: '#ff0044', blur: 24, fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 200, `Score: ${this.finalScore}s`, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(W / 2, 238, `Best: ${this.highScore}s`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#888899',
    }).setOrigin(0.5);

    if (this.finalScore > 0 && this.finalScore >= this.highScore) {
      this.add.text(W / 2, 275, '★  NEW RECORD  ★', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffcc00',
        shadow: { color: '#ffaa00', blur: 12, fill: true },
      }).setOrigin(0.5);
    }

    this.add.text(W / 2, 340, this.mode === 'online' ? 'SPACE / R — back to menu' : 'SPACE / R — play again', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#00ffcc',
    }).setOrigin(0.5);

    this.add.text(W / 2, 372, 'ESC — main menu', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#444466',
    }).setOrigin(0.5);
  }

  update() {
    this.gridOffset = (this.gridOffset + 0.5) % GRID_SIZE;
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x0a0a1a, 0.92);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1, 0xff4466, 0.06);
    for (let x = -GRID_SIZE + (this.gridOffset % GRID_SIZE); x < W + GRID_SIZE; x += GRID_SIZE) {
      g.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y < H + GRID_SIZE; y += GRID_SIZE) {
      g.lineBetween(0, y, W, y);
    }
  }
}
