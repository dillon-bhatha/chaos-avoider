import Phaser from 'phaser';
import { W, H, GRID_SIZE } from '../constants.js';

const WS_URL = window.location.hostname === 'localhost'
  ? `ws://localhost:3001`
  : `wss://JOUW-SERVER.onrender.com`;

export class OnlineMenu extends Phaser.Scene {
  constructor() { super('OnlineMenu'); }

  create() {
    this.gfx = this.add.graphics();
    this.gridOffset = 0;
    this.state = 'menu'; // menu | creating | waiting | joining
    this.menuIndex = 0;
    this.joinCode = '';
    this.ws = null;
    this._seed = 0;
    this._isHost = false;

    this.buildUI();
    this.input.keyboard.on('keydown', this.onKey, this);
    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown', this.onKey, this);
    });
  }

  buildUI() {
    this.add.text(W / 2, 50, 'MULTIPLAYER', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ff44ff',
      shadow: { color: '#ff44ff', blur: 16, fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 88, 'Play online with a friend', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.createBtn = this.add.text(W / 2, 185, '▶  Create Room', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(W / 2, 208, 'Generate a room code to share', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555577',
    }).setOrigin(0.5);

    this.joinBtn = this.add.text(W / 2, 275, '▶  Join Room', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(W / 2, 298, 'Enter a code from your friend', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555577',
    }).setOrigin(0.5);

    this.statusText = this.add.text(W / 2, 360, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#00ffcc',
    }).setOrigin(0.5);

    this.codeDisplay = this.add.text(W / 2, 400, '', {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffcc00',
      shadow: { color: '#ffaa00', blur: 14, fill: true },
    }).setOrigin(0.5);

    this.selBox = this.add.graphics();

    this.hintText = this.add.text(W / 2, H - 24, 'ESC back   ↑↓ navigate   SPACE select', {
      fontFamily: 'monospace', fontSize: '12px', color: '#444466',
    }).setOrigin(0.5);
  }

  onKey(e) {
    if (e.code === 'Escape') {
      if (this.ws) { this.ws.close(); this.ws = null; }
      this.scene.start('MainMenu');
      return;
    }

    if (this.state === 'menu') {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.menuIndex = (this.menuIndex - 1 + 2) % 2;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.menuIndex = (this.menuIndex + 1) % 2;
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (this.menuIndex === 0) this.createRoom();
        else this.startJoin();
      }
      return;
    }

    if (this.state === 'joining') {
      if (e.code === 'Backspace') {
        this.joinCode = this.joinCode.slice(0, -1);
      } else if ((e.code === 'Space' || e.code === 'Enter') && this.joinCode.length === 4) {
        this.joinRoom();
      } else if (e.key.length === 1 && /[A-Za-z0-9]/.test(e.key) && this.joinCode.length < 4) {
        this.joinCode += e.key.toUpperCase();
      }
      this.codeDisplay.setText(this.joinCode.padEnd(4, '_'));
    }
  }

  createRoom() {
    this.state = 'creating';
    this.statusText.setText('Connecting...');
    this.connectWS(() => {
      this.ws.send(JSON.stringify({ type: 'create' }));
    });
  }

  startJoin() {
    this.state = 'joining';
    this.joinCode = '';
    this.statusText.setText('Enter room code:');
    this.codeDisplay.setText('____');
    this.hintText.setText('Type the 4-letter code   ENTER confirm   ESC back');
  }

  joinRoom() {
    this.state = 'waiting';
    this.statusText.setText('Connecting...');
    this.connectWS(() => {
      this.ws.send(JSON.stringify({ type: 'join', code: this.joinCode }));
    });
  }

  connectWS(onOpen) {
    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = onOpen;
      this.ws.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        this.onWsMessage(msg);
      };
      this.ws.onerror = () => {
        this.state = 'menu';
        this.statusText.setText('Could not connect to server');
        this.codeDisplay.setText('');
        this.ws = null;
      };
      this.ws.onclose = () => {
        if (this.state !== 'menu' && this.state !== 'done') {
          this.state = 'menu';
          this.statusText.setText('Disconnected');
          this.codeDisplay.setText('');
          this.ws = null;
        }
      };
    } catch {
      this.state = 'menu';
      this.statusText.setText('Connection failed');
    }
  }

  onWsMessage(msg) {
    if (msg.type === 'created') {
      this._seed = msg.seed;
      this._isHost = true;
      this.statusText.setText('Waiting for friend to join...');
      this.codeDisplay.setText(msg.code);
    } else if (msg.type === 'start') {
      this.state = 'done';
      this.sys.game.registry.set('ws', this.ws);
      this.scene.start('Game', { mode: 'online', seed: msg.seed, isHost: this._isHost });
    } else if (msg.type === 'error') {
      this.state = 'menu';
      this.statusText.setText(msg.msg || 'Error');
      this.codeDisplay.setText('');
      if (this.ws) { this.ws.close(); this.ws = null; }
    }
  }

  update() {
    this.gridOffset = (this.gridOffset + 0.5) % GRID_SIZE;
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x0a0a1a);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1, 0xff44ff, 0.07);
    for (let x = -GRID_SIZE + (this.gridOffset % GRID_SIZE); x < W + GRID_SIZE; x += GRID_SIZE) {
      g.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y < H + GRID_SIZE; y += GRID_SIZE) {
      g.lineBetween(0, y, W, y);
    }

    this.selBox.clear();
    if (this.state === 'menu') {
      const ys = [185, 275];
      const y = ys[this.menuIndex];
      this.selBox.lineStyle(2, 0xff44ff, 0.8);
      this.selBox.strokeRect(W / 2 - 190, y - 28, 380, 56);
      this.selBox.fillStyle(0xff44ff, 0.04);
      this.selBox.fillRect(W / 2 - 190, y - 28, 380, 56);
      this.createBtn.setStyle({ color: this.menuIndex === 0 ? '#ff44ff' : '#ffffff' });
      this.joinBtn.setStyle({ color: this.menuIndex === 1 ? '#ff44ff' : '#ffffff' });
    }
  }
}
