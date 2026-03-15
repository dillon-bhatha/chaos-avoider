import Phaser from 'phaser';
import {
  W, H, PLAYER_R, PLAYER_SPEED, TRAIL_LEN,
  BASE_SPEED, BASE_INTERVAL, MIN_INTERVAL, SPEED_STEP, INTERVAL_STEP,
  STAR_COUNT, GRID_SIZE, SHAKE_DECAY,
  LS_KEY_SOLO, LS_KEY_MULTI,
  FLIP_INTERVAL, ARENA_SHRINK_DUR, ARENA_MAX_FRAC,
  HUE_A, HUE_B, HUE_CYCLE_RATE, SAFE_HUE_RANGE, SAFE_BONUS, GHOST_ALPHA,
  BLOCK_TYPES,
} from '../constants.js';
import { settings } from '../settings.js';
import { AudioBeat } from '../audio.js';
import { hsbToRgb, isHueSafe, circleRect, clamp, seededRng } from '../utils.js';

function hsb(h, s, b) {
  const { r, g } = hsbToRgb(h, s, b);
  const bl = hsbToRgb(h, s, b).b;
  return Phaser.Display.Color.GetColor(r, g, bl);
}

export class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.gameMode = data.mode || 'solo';
    this.originalSeed = data.seed || 0;
    this.isHost = data.isHost || false;
    this.onlinePhase = null; // 'countdown' | 'playing' | 'postgame' | 'waiting_rematch' | 'disconnected'
    this.countdownVal = 0;
    this.myReady = false;
    this.opponentReady = false;
    this.onlineResult = null; // 'win' | 'lose'
    this.winner = null; // 'A' | 'B' for versus mode
  }

  create() {
    this.gfx = this.add.graphics();
    this.audio = new AudioBeat();
    this._leaving = false;
    this.sys.game.events.on('postrender', this.draw, this);
    this.events.once('shutdown', () => {
      this.sys.game.events.off('postrender', this.draw, this);
      if (this.ws) this.ws.onmessage = null;
    });

    if (this.gameMode === 'online') {
      this.ws = this.sys.game.registry.get('ws');
      if (this.ws) {
        this.ws.onmessage = (event) => {
          let msg;
          try { msg = JSON.parse(event.data); } catch { return; }
          if (msg.type === 'pos') {
            this.pB.x = msg.x;
            this.pB.y = msg.y;
          } else if (msg.type === 'die') {
            if (this.alive) this.endOnline('win');
          } else if (msg.type === 'disconnect') {
            this.alive = false;
            this.onlinePhase = 'disconnected';
          } else if (msg.type === 'opponent_ready') {
            this.opponentReady = true;
          } else if (msg.type === 'start') {
            this.originalSeed = msg.seed;
            this.myReady = false;
            this.opponentReady = false;
            this.startCountdown();
          }
        };
      }
    }

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.gameMode === 'online') {
        if (this.onlinePhase === 'postgame') {
          this.myReady = true;
          this.onlinePhase = 'waiting_rematch';
          if (this.ws?.readyState === 1) {
            this.ws.send(JSON.stringify({ type: 'ready' }));
          }
        }
        return;
      }
      if (this.gameMode === 'solo' && settings.gravityFlip) {
        this.flipGravity();
      }
    });

    this.input.keyboard.on('keydown-R', () => {
      if (this.gameMode === 'online') this.leaveScene('MainMenu');
      else this.resetGame();
    });
    this.input.keyboard.on('keydown-ESC', () => this.leaveScene('MainMenu'));

    this.stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      bright: Math.random(),
    }));

    this.highScore = parseInt(localStorage.getItem(
      this.gameMode === 'multi' ? LS_KEY_MULTI : LS_KEY_SOLO
    ) || '0');

    this.ghostRun = [];
    this.resetGame();

    if (this.gameMode === 'online') {
      this.startCountdown();
    }
  }

  startCountdown() {
    this.onlinePhase = 'countdown';
    this.alive = false;
    this.blocks = [];
    this.particles = [];
    this.trailA = [];
    this.trailB = [];
    this.countdownVal = 3;

    const tick = () => {
      this.countdownVal--;
      if (this.countdownVal < 0) {
        this.resetGame();
        this.onlinePhase = 'playing';
      } else {
        this.time.delayedCall(this.countdownVal === 0 ? 800 : 1000, tick);
      }
    };
    this.time.delayedCall(1000, tick);
  }

  resetGame() {
    this.rng = this.originalSeed ? seededRng(this.originalSeed) : Math.random;
    if (this.gameMode === 'versus') {
      this.pA = { x: W * 0.25, y: H / 2 };
      this.pB = { x: W * 0.75, y: H / 2 };
    } else {
      this.pA = { x: W * 0.3, y: H / 2 };
      this.pB = this.gameMode === 'multi'
        ? { x: W * 0.7, y: H / 2 }
        : { x: W - W * 0.3, y: H / 2 };
    }
    this.winner = null;

    this.trailA = [];
    this.trailB = [];
    this.blocks = [];
    this.particles = [];

    this.score = 0;
    this.spawnTimer = 0;
    this.spawnInterval = BASE_INTERVAL;
    this.blockSpeed = BASE_SPEED;
    this.survivalTimer = 0;

    this.shake = 0;
    this.gridOffset = 0;
    this.beatPulse = 0;

    this.gravDir = 1;
    this.gravFlipTimer = FLIP_INTERVAL;

    this.hueA = HUE_A;
    this.hueB = HUE_B;

    this.arenaLeft = 0;
    this.arenaRight = W;

    this.prevGhostRun = [...this.ghostRun];
    this.ghostRun = [];
    this.ghostFrame = 0;

    this.alive = true;
    this.audio.init();
    this.audio.resume();
  }

  flipGravity() {
    this.gravDir *= -1;
    for (const b of this.blocks) b.dir *= -1;
    this.shake += 8;
  }

  spawnBlock(xOverride, typeIdx) {
    const rng = this.rng;
    const type = BLOCK_TYPES[typeIdx !== undefined ? typeIdx : Math.floor(rng() * BLOCK_TYPES.length)];
    const lo = this.arenaLeft + type.w / 2;
    const hi = this.arenaRight - type.w / 2;
    const x = xOverride !== undefined ? xOverride : lo + rng() * (hi - lo);
    const hue = rng() * 360;
    this.blocks.push({
      x,
      y: this.gravDir === 1 ? -type.h : H + type.h,
      w: type.w,
      h: type.h,
      dir: this.gravDir,
      speed: this.blockSpeed * type.spdMul,
      hue,
    });
  }

  spawnVersusBlocks() {
    const rng = this.rng;
    for (const owner of ['A', 'B']) {
      const type = BLOCK_TYPES[Math.floor(rng() * BLOCK_TYPES.length)];
      const half = owner === 'A' ? 0 : W / 2;
      const x = half + type.w / 2 + rng() * (W / 2 - type.w);
      const hue = rng() * 360;
      this.blocks.push({
        x, owner,
        y: this.gravDir === 1 ? -type.h : H + type.h,
        w: type.w, h: type.h,
        dir: this.gravDir,
        speed: this.blockSpeed * type.spdMul,
        hue,
      });
    }
  }

  spawnParticle(x, y, hue) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        hue,
        r: 2 + Math.random() * 3,
      });
    }
  }

  update(time, delta) {
    if (this.gameMode === 'online' && this.onlinePhase !== 'playing') return;
    if (!this.alive) return;

    const dt = delta / (1000 / 60);

    this.survivalTimer += dt;
    this.score = Math.floor(this.survivalTimer / 60);

    const beat = this.audio.update();
    if (beat) {
      this.beatPulse = 1;
      this.shake += 1;
    }
    this.beatPulse *= Math.pow(0.88, dt);
    this.shake = Math.max(0, this.shake * Math.pow(SHAKE_DECAY, dt));

    this.movePlayer(dt);

    if (settings.colorMatch) {
      this.hueA = (this.hueA + HUE_CYCLE_RATE * dt) % 360;
      this.hueB = (this.hueB + HUE_CYCLE_RATE * dt) % 360;
    }

    if (settings.gravityFlip && this.gameMode === 'solo') {
      this.gravFlipTimer -= dt;
      if (this.gravFlipTimer <= 0) {
        this.flipGravity();
        this.gravFlipTimer = FLIP_INTERVAL;
      }
    }

    if (settings.shrinkArena) {
      const frac = Math.min(this.survivalTimer / ARENA_SHRINK_DUR, 1);
      const margin = frac * ARENA_MAX_FRAC * W;
      this.arenaLeft = margin;
      this.arenaRight = W - margin;
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      if (this.gameMode === 'versus') {
        this.spawnVersusBlocks();
      } else {
        this.spawnBlock();
        if (settings.mirrorPlayer && this.gameMode === 'solo') {
          this.spawnBlock(W - this.blocks[this.blocks.length - 1].x);
        }
      }
      this.spawnInterval = Math.max(MIN_INTERVAL, BASE_INTERVAL - Math.floor(this.survivalTimer / 60) * INTERVAL_STEP);
      this.blockSpeed = BASE_SPEED + Math.floor(this.survivalTimer / 60) * SPEED_STEP;
    }

    for (const b of this.blocks) {
      b.y += b.speed * b.dir * dt;
    }

    for (const b of this.blocks) {
      const out = b.dir === 1 ? b.y - b.h / 2 > H : b.y + b.h / 2 < 0;
      if (out) b.dead = true;
    }

    for (const b of this.blocks) {
      if (b.dead) continue;
      const hitA = (b.owner !== 'B') && circleRect(this.pA.x, this.pA.y, PLAYER_R, b.x, b.y, b.w, b.h);
      const hitB = (this.gameMode === 'multi' || this.gameMode === 'versus' || (settings.mirrorPlayer && this.gameMode === 'solo'))
        ? (b.owner !== 'A') && circleRect(this.pB.x, this.pB.y, PLAYER_R, b.x, b.y, b.w, b.h)
        : false;

      if (hitA) {
        if (settings.colorMatch && isHueSafe(b.hue, this.hueA, SAFE_HUE_RANGE)) {
          this.score += SAFE_BONUS;
          this.spawnParticle(this.pA.x, this.pA.y, b.hue);
          b.dead = true;
        } else {
          this.die('A'); return;
        }
      }
      if (hitB && !b.dead) {
        if (settings.colorMatch && isHueSafe(b.hue, this.hueB, SAFE_HUE_RANGE)) {
          this.score += SAFE_BONUS;
          this.spawnParticle(this.pB.x, this.pB.y, b.hue);
          b.dead = true;
        } else {
          this.die('B'); return;
        }
      }
    }

    this.blocks = this.blocks.filter(b => !b.dead);

    this.trailA.unshift({ x: this.pA.x, y: this.pA.y });
    if (this.trailA.length > TRAIL_LEN) this.trailA.pop();

    if (this.gameMode === 'multi' || this.gameMode === 'online') {
      this.trailB.unshift({ x: this.pB.x, y: this.pB.y });
      if (this.trailB.length > TRAIL_LEN) this.trailB.pop();
    }

    this.ghostRun.push({
      ax: this.pA.x, ay: this.pA.y,
      bx: this.gameMode === 'multi' ? this.pB.x : W - this.pA.x,
      by: this.gameMode === 'multi' ? this.pB.y : this.pA.y,
    });

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.95, dt);
      p.vy *= Math.pow(0.95, dt);
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    if (this.gameMode === 'online' && this.ws?.readyState === 1) {
      this._posTick = (this._posTick || 0) + 1;
      if (this._posTick % 4 === 0) {
        this.ws.send(JSON.stringify({ type: 'pos', x: this.pA.x, y: this.pA.y }));
      }
    }
  }

  movePlayer(dt = 1) {
    const k = this.keys;
    const speed = PLAYER_SPEED * dt;

    if (this.gameMode === 'online') {
      if (k.a.isDown || k.left.isDown)  this.pA.x -= speed;
      if (k.d.isDown || k.right.isDown) this.pA.x += speed;
      if (k.w.isDown || k.up.isDown)    this.pA.y -= speed;
      if (k.s.isDown || k.down.isDown)  this.pA.y += speed;
      const lo = this.arenaLeft + PLAYER_R;
      const hi = this.arenaRight - PLAYER_R;
      this.pA.x = clamp(this.pA.x, lo, hi);
      this.pA.y = clamp(this.pA.y, PLAYER_R, H - PLAYER_R);
      return;
    }

    const solo = this.gameMode === 'solo';
    if (k.a.isDown || (solo && k.left.isDown))  this.pA.x -= speed;
    if (k.d.isDown || (solo && k.right.isDown)) this.pA.x += speed;
    if (k.w.isDown || (solo && k.up.isDown))    this.pA.y -= speed;
    if (k.s.isDown || (solo && k.down.isDown))  this.pA.y += speed;

    if (this.gameMode === 'multi' || this.gameMode === 'versus') {
      if (k.left.isDown)  this.pB.x -= speed;
      if (k.right.isDown) this.pB.x += speed;
      if (k.up.isDown)    this.pB.y -= speed;
      if (k.down.isDown)  this.pB.y += speed;
    }

    if (this.gameMode === 'solo' && settings.mirrorPlayer) {
      this.pB.x = W - this.pA.x;
      this.pB.y = this.pA.y;
    }

    const lo = this.arenaLeft + PLAYER_R;
    const hi = this.arenaRight - PLAYER_R;
    if (this.gameMode === 'versus') {
      this.pA.x = clamp(this.pA.x, lo, W / 2 - PLAYER_R);
      this.pA.y = clamp(this.pA.y, PLAYER_R, H - PLAYER_R);
      this.pB.x = clamp(this.pB.x, W / 2 + PLAYER_R, hi);
      this.pB.y = clamp(this.pB.y, PLAYER_R, H - PLAYER_R);
    } else {
      this.pA.x = clamp(this.pA.x, lo, hi);
      this.pA.y = clamp(this.pA.y, PLAYER_R, H - PLAYER_R);
      if (this.gameMode === 'multi') {
        this.pB.x = clamp(this.pB.x, lo, hi);
        this.pB.y = clamp(this.pB.y, PLAYER_R, H - PLAYER_R);
      }
    }
  }

  die(who = 'A') {
    if (!this.alive) return;
    this.winner = this.gameMode === 'versus' ? (who === 'A' ? 'B' : 'A') : null;

    if (this.gameMode === 'online') {
      this.endOnline('lose');
      return;
    }

    this.alive = false;
    this.shake += 20;
    this.spawnParticle(this.pA.x, this.pA.y, this.hueA);
    if (settings.mirrorPlayer || this.gameMode === 'multi' || this.gameMode === 'versus' || this.gameMode === 'online') {
      this.spawnParticle(this.pB.x, this.pB.y, this.hueB);
    }

    const lsKey = this.gameMode === 'multi' || this.gameMode === 'versus' ? LS_KEY_MULTI : LS_KEY_SOLO;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(lsKey, String(this.highScore));
    }

    this.time.delayedCall(800, () => {
      this.scene.start('GameOver', {
        score: this.score,
        highScore: this.highScore,
        mode: this.gameMode,
        ghostRun: this.ghostRun,
        winner: this.winner,
      });
    });
  }

  endOnline(result) {
    if (!this.alive) return;
    this.alive = false;
    this.onlineResult = result;
    if (result === 'lose' && this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify({ type: 'die' }));
    }
    this.shake += result === 'lose' ? 20 : 10;
    this.spawnParticle(this.pA.x, this.pA.y, this.hueA);
    if (result === 'win') this.spawnParticle(this.pB.x, this.pB.y, this.hueB);
    const lsKey = LS_KEY_SOLO;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(lsKey, String(this.highScore));
    }
    this.onlinePhase = 'postgame';
  }

  leaveScene(key) {
    this._leaving = true;
    if (this.gameMode === 'online' && this.ws) {
      this.ws.close();
      this.sys.game.registry.set('ws', null);
    }
    this.scene.start(key);
  }

  draw() {
    if (this._leaving) return;
    this.gridOffset = ((this.gridOffset || 0) + 0.5) % GRID_SIZE;

    // Keepalive: prevent Render.com from closing idle WS connections
    if (this.gameMode === 'online' && this.ws?.readyState === 1) {
      this._keepTick = (this._keepTick || 0) + 1;
      if (this._keepTick % (60 * 4) === 0) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }
    const g = this.gfx;
    g.clear();
    const ctx = this.sys.canvas.getContext('2d');
    const res = this.sys.game.config.resolution || 1;
    const ox = this.shake > 0 ? (Math.random() * 2 - 1) * this.shake : 0;
    const oy = this.shake > 0 ? (Math.random() * 2 - 1) * this.shake : 0;

    ctx.save();
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.save();
    ctx.translate(ox, oy);

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-10, -10, W + 20, H + 20);

    const pulse = (this.beatPulse || 0) * 0.12;
    ctx.strokeStyle = `rgba(0,255,255,${0.05 + pulse})`;
    ctx.lineWidth = 1;
    for (let x = -GRID_SIZE + (this.gridOffset % GRID_SIZE); x < W + GRID_SIZE; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H + GRID_SIZE; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    for (const s of this.stars) {
      const a = 0.3 + s.bright * 0.5 + (this.beatPulse || 0) * 0.2;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.gameMode === 'versus') {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.setLineDash([]);
    }

    if (settings.shrinkArena && this.arenaLeft > 0) {
      ctx.fillStyle = 'rgba(255,30,30,0.15)';
      ctx.fillRect(0, 0, this.arenaLeft, H);
      ctx.fillRect(this.arenaRight, 0, W - this.arenaRight, H);
      ctx.strokeStyle = 'rgba(255,60,60,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.arenaLeft, 0); ctx.lineTo(this.arenaLeft, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.arenaRight, 0); ctx.lineTo(this.arenaRight, H); ctx.stroke();
    }

    if (settings.ghostRun && this.prevGhostRun?.length > 0 && this.ghostFrame < this.prevGhostRun.length) {
      const gf = this.prevGhostRun[this.ghostFrame];
      this.ghostFrame++;
      ctx.globalAlpha = GHOST_ALPHA;
      this.drawPlayerCtx(ctx, gf.ax, gf.ay, this.hueA);
      if (settings.mirrorPlayer || this.gameMode === 'multi') {
        this.drawPlayerCtx(ctx, gf.bx, gf.by, this.hueB);
      }
      ctx.globalAlpha = 1;
    }

    for (const p of this.particles) {
      const a = p.life / p.maxLife;
      const { r, g: pg, b: pb } = hsbToRgb(p.hue, 80, 100);
      ctx.fillStyle = `rgba(${r},${pg},${pb},${a})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${r},${pg},${pb},0.8)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (let i = this.trailA.length - 1; i >= 0; i--) {
      const a = (1 - i / TRAIL_LEN) * 0.4;
      const { r, g: pg, b: pb } = hsbToRgb(this.hueA, 80, 100);
      ctx.fillStyle = `rgba(${r},${pg},${pb},${a})`;
      ctx.beginPath();
      ctx.arc(this.trailA[i].x, this.trailA[i].y, PLAYER_R * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    if (settings.mirrorPlayer || this.gameMode === 'multi' || this.gameMode === 'online' || this.gameMode === 'versus') {
      for (let i = this.trailB.length - 1; i >= 0; i--) {
        const a = (1 - i / TRAIL_LEN) * 0.4;
        const { r, g: pg, b: pb } = hsbToRgb(this.hueB, 80, 100);
        ctx.fillStyle = `rgba(${r},${pg},${pb},${a})`;
        ctx.beginPath();
        ctx.arc(this.trailB[i].x, this.trailB[i].y, PLAYER_R * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const b of this.blocks) {
      const { r, g: pg, b: pb } = hsbToRgb(b.hue, 80, 100);
      const safe = settings.colorMatch && (isHueSafe(b.hue, this.hueA, SAFE_HUE_RANGE) || isHueSafe(b.hue, this.hueB, SAFE_HUE_RANGE));
      ctx.shadowBlur = safe ? 18 : 10;
      ctx.shadowColor = `rgba(${r},${pg},${pb},0.9)`;
      ctx.fillStyle = `rgba(${r},${pg},${pb},0.85)`;
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      if (safe) {
        ctx.strokeStyle = `rgba(255,255,255,0.6)`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      }
      ctx.shadowBlur = 0;
    }

    if (this.alive) {
      this.drawPlayerCtx(ctx, this.pA.x, this.pA.y, this.hueA);
      if (settings.mirrorPlayer || this.gameMode === 'multi' || this.gameMode === 'online' || this.gameMode === 'versus') {
        this.drawPlayerCtx(ctx, this.pB.x, this.pB.y, this.hueB);
      }
    }

    ctx.restore(); // removes translate

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 16, 30);

    ctx.fillStyle = '#888899';
    ctx.font = '14px monospace';
    ctx.fillText(`Best: ${this.highScore}`, 16, 50);

    if (settings.gravityFlip && this.gameMode === 'solo') {
      const flipPct = Math.round((this.gravFlipTimer / FLIP_INTERVAL) * 100);
      ctx.fillStyle = `rgba(255,180,0,${0.5 + (this.beatPulse || 0) * 0.5})`;
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`FLIP ${flipPct}%`, W - 16, 30);
    }

    if (settings.colorMatch) {
      const { r: rA, g: gA, b: bA } = hsbToRgb(this.hueA, 100, 100);
      ctx.fillStyle = `rgb(${rA},${gA},${bA})`;
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('● P1', W - 16, 50);

      if (settings.mirrorPlayer || this.gameMode === 'multi') {
        const { r: rB, g: gB, b: bB } = hsbToRgb(this.hueB, 100, 100);
        ctx.fillStyle = `rgb(${rB},${gB},${bB})`;
        ctx.fillText('● P2', W - 60, 50);
      }
    }

    if (this.gameMode === 'multi') {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('P1: WASD   P2: ↑↓←→', W / 2, H - 8);
    }

    // Online overlays
    if (this.gameMode === 'online') {
      if (this.onlinePhase === 'countdown') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        const label = this.countdownVal > 0 ? String(this.countdownVal) : 'GO!';
        const col = this.countdownVal > 0 ? '#ffffff' : '#00ff88';
        ctx.shadowBlur = 40;
        ctx.shadowColor = col;
        ctx.fillStyle = col;
        ctx.font = 'bold 96px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, W / 2, H / 2 + 36);
        ctx.shadowBlur = 0;

      } else if (this.onlinePhase === 'postgame' || this.onlinePhase === 'waiting_rematch') {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, W, H);

        const isWin = this.onlineResult === 'win';
        ctx.shadowBlur = 20;
        ctx.shadowColor = isWin ? '#00ff88' : '#ff4466';
        ctx.fillStyle = isWin ? '#00ff88' : '#ff4466';
        ctx.font = 'bold 44px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isWin ? 'YOU WIN!' : 'YOU LOSE', W / 2, H / 2 - 70);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px monospace';
        ctx.fillText(`Score: ${this.score}s`, W / 2, H / 2 - 20);

        // Ready indicators
        const p1label = this.isHost ? 'You' : 'Player 1';
        const p2label = this.isHost ? 'Player 2' : 'You';
        const p1ready = this.isHost ? this.myReady : this.opponentReady;
        const p2ready = this.isHost ? this.opponentReady : this.myReady;

        ctx.font = '15px monospace';
        ctx.fillStyle = p1ready ? '#00ff88' : '#555577';
        ctx.textAlign = 'right';
        ctx.fillText((p1ready ? '✓ ' : '○ ') + p1label, W / 2 - 10, H / 2 + 30);

        ctx.fillStyle = p2ready ? '#00ff88' : '#555577';
        ctx.textAlign = 'left';
        ctx.fillText((p2ready ? '✓ ' : '○ ') + p2label, W / 2 + 10, H / 2 + 30);

        ctx.textAlign = 'center';
        if (this.onlinePhase === 'postgame') {
          ctx.fillStyle = '#00ffcc';
          ctx.font = '18px monospace';
          ctx.fillText('SPACE — rematch', W / 2, H / 2 + 65);
        } else {
          ctx.fillStyle = '#888899';
          ctx.font = '16px monospace';
          ctx.fillText('Waiting for opponent...', W / 2, H / 2 + 65);
        }

        ctx.fillStyle = '#444466';
        ctx.font = '13px monospace';
        ctx.fillText('ESC — main menu', W / 2, H / 2 + 92);

      } else if (this.onlinePhase === 'disconnected') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff4466';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Opponent disconnected', W / 2, H / 2 - 20);
        ctx.fillStyle = '#444466';
        ctx.font = '14px monospace';
        ctx.fillText('ESC / R — main menu', W / 2, H / 2 + 20);
      }
    }

    ctx.restore(); // removes resolution scale
  }

  drawPlayerCtx(ctx, x, y, hue) {
    const { r, g, b } = hsbToRgb(hue, 100, 70);
    ctx.shadowBlur = 30;
    ctx.shadowColor = `rgba(${r},${g},${b},1)`;
    ctx.fillStyle = `rgba(${r},${g},${b},0.1)`;
    ctx.beginPath(); ctx.arc(x, y, PLAYER_R * 2, 0, Math.PI * 2); ctx.fill();

    const { r: r2, g: g2, b: b2 } = hsbToRgb(hue, 80, 100);
    ctx.fillStyle = `rgb(${r2},${g2},${b2})`;
    ctx.beginPath(); ctx.arc(x, y, PLAYER_R, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,0.9)`;
    ctx.beginPath(); ctx.arc(x, y, PLAYER_R * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}
