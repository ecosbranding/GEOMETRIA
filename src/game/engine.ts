import { CHAPTERS, getLevelParams, LevelParams, Shape } from './levels';
import { sfx } from './sfx';

export interface LevelResult {
  score: number; // points earned in this level
  stars: number;
  time: number;
  maxCombo: number;
  livesLeft: number;
}

export interface EngineCallbacks {
  onLevelComplete: (r: LevelResult) => void;
  onGameOver: (scoreThisLevel: number) => void;
  onPauseToggle: (paused: boolean) => void;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; shape?: Shape; rot: number; vr: number }
interface FloatText { x: number; y: number; text: string; life: number; color: string; size: number }
interface Gem { x: number; y: number; r: number; born: number; pulse: number; shape: Shape; pop: number }
interface Bouncer { kind: 'bouncer'; x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; shape: Shape }
interface Chaser { kind: 'chaser'; x: number; y: number; vx: number; vy: number; r: number; rot: number }
interface Shooter { kind: 'shooter'; x: number; y: number; r: number; rot: number; cd: number; interval: number }
interface Bullet { x: number; y: number; vx: number; vy: number; r: number; life: number }
interface Laser { x: number; y: number; angle: number; t: number; warn: number; fire: number; sweep: number }

type Hazard = Bouncer | Chaser | Shooter;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, r: number, rot = 0) {
  ctx.beginPath();
  if (shape === 'circle') { ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); return; }
  const n = shape === 'triangle' ? 3 : shape === 'square' ? 4 : shape === 'hexagon' ? 6 : 10;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = shape === 'star' ? (i % 2 === 0 ? r : r * 0.45) : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W = 900; H = 560; // logical size
  dpr = 1;
  scale = 1; ox = 0; oy = 0;

  chapter = 1; level = 1;
  params!: LevelParams;
  color = '#22d3ee'; color2 = '#a5f3fc'; bg = '#06121f';
  skin: Shape = 'circle';

  // state
  running = false; paused = false; over = false; done = false;
  time = 0; countdown = 1.6; shake = 0; flash = 0; hitstop = 0;
  shrinkM = 0;

  player = { x: 450, y: 280, vx: 0, vy: 0, r: 14, inv: 0, lives: 3, rot: 0, trail: [] as { x: number; y: number }[] };
  gems: Gem[] = [];
  hazards: Hazard[] = [];
  bullets: Bullet[] = [];
  lasers: Laser[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];

  collected = 0; score = 0; combo = 0; comboT = 0; maxCombo = 0; hits = 0;
  laserCd = 0;

  keys = new Set<string>();
  touch = { active: false, id: -1, sx: 0, sy: 0, dx: 0, dy: 0 };
  input = { x: 0, y: 0 };

  raf = 0; last = 0;
  cb: EngineCallbacks;
  resizeObs?: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cb = cb;
    this.bindInput();
    this.resize();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
  }

  // ---------- setup ----------
  resize() {
    const parent = this.canvas.parentElement;
    const cw = parent ? parent.clientWidth : window.innerWidth;
    const chh = parent ? parent.clientHeight : window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = cw * this.dpr; this.canvas.height = chh * this.dpr;
    this.canvas.style.width = cw + 'px'; this.canvas.style.height = chh + 'px';
    const portrait = chh > cw;
    this.W = portrait ? 560 : 900; this.H = portrait ? 900 : 560;
    this.scale = Math.min(cw / this.W, chh / this.H);
    this.ox = (cw - this.W * this.scale) / 2; this.oy = (chh - this.H * this.scale) / 2;
    this.player.x = clamp(this.player.x, 0, this.W); this.player.y = clamp(this.player.y, 0, this.H);
  }

  start(chapter: number, level: number, skin: Shape) {
    const ch = CHAPTERS[chapter - 1];
    this.chapter = chapter; this.level = level; this.skin = skin;
    this.color = ch.color; this.color2 = ch.color2; this.bg = ch.bg;
    this.params = getLevelParams(chapter, level);
    this.resize();
    this.player = { x: this.W / 2, y: this.H / 2, vx: 0, vy: 0, r: 14, inv: 1.2, lives: this.params.lives, rot: 0, trail: [] };
    this.gems = []; this.hazards = []; this.bullets = []; this.lasers = []; this.particles = []; this.texts = [];
    this.collected = 0; this.score = 0; this.combo = 0; this.comboT = 0; this.maxCombo = 0; this.hits = 0;
    this.time = 0; this.countdown = 1.6; this.shake = 0; this.flash = 0; this.hitstop = 0; this.shrinkM = 0;
    this.laserCd = this.params.laserInterval ? 2.5 : 0;
    this.over = false; this.done = false; this.paused = false;
    const p = this.params;
    for (let i = 0; i < p.bouncers; i++) this.spawnBouncer();
    for (let i = 0; i < p.chasers; i++) this.spawnChaser();
    for (let i = 0; i < p.shooters; i++) this.spawnShooter(i, p.shooters);
    for (let i = 0; i < p.gemsAtOnce; i++) this.spawnGem();
    if (!this.running) { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
  }

  destroy() {
    this.running = false; cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  awayFromPlayer(min = 160): { x: number; y: number } {
    for (let i = 0; i < 30; i++) {
      const x = rand(40 + this.shrinkM, this.W - 40 - this.shrinkM), y = rand(40 + this.shrinkM, this.H - 40 - this.shrinkM);
      if (Math.hypot(x - this.player.x, y - this.player.y) > min) return { x, y };
    }
    return { x: 40, y: 40 };
  }
  spawnBouncer() {
    const p = this.awayFromPlayer(200);
    const sp = rand(90, 150) * this.params.speedMul, a = rand(0, Math.PI * 2);
    const shapes: Shape[] = ['circle', 'triangle', 'square', 'hexagon', 'star'];
    this.hazards.push({ kind: 'bouncer', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(14, 24), rot: 0, vr: rand(-3, 3), shape: shapes[(this.chapter - 1 + Math.floor(rand(0, 2))) % 5] });
  }
  spawnChaser() {
    const p = this.awayFromPlayer(260);
    this.hazards.push({ kind: 'chaser', x: p.x, y: p.y, vx: 0, vy: 0, r: 12, rot: 0 });
  }
  spawnShooter(i: number, n: number) {
    const corners = [[70, 70], [this.W - 70, this.H - 70], [this.W - 70, 70], [70, this.H - 70], [this.W / 2, 60]];
    const c = corners[i % corners.length];
    this.hazards.push({ kind: 'shooter', x: c[0], y: c[1], r: 18, rot: 0, cd: 1.5 + i * 0.6, interval: Math.max(1.1, 2.6 - this.level * 0.12 - (n - 1) * 0.1) });
  }
  spawnGem() {
    const p = this.awayFromPlayer(120);
    this.gems.push({ x: p.x, y: p.y, r: 10, born: this.time, pulse: rand(0, 6), shape: CHAPTERS[this.chapter - 1].shape, pop: 0 });
  }

  // ---------- input ----------
  onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if ((k === 'p' || k === 'escape') && !this.over && !this.done && this.countdown <= 0) { this.togglePause(); return; }
    this.keys.add(k);
  };
  onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
  onBlur = () => { this.keys.clear(); if (!this.paused && !this.over && !this.done && this.countdown <= 0) this.togglePause(); };

  bindInput() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => {
      if (this.touch.active) return;
      this.touch = { active: true, id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.touch.active || e.pointerId !== this.touch.id) return;
      this.touch.dx = e.clientX - this.touch.sx; this.touch.dy = e.clientY - this.touch.sy;
      // drag the joystick origin along so direction changes feel instant
      const d = Math.hypot(this.touch.dx, this.touch.dy), max = 48;
      if (d > max) { this.touch.sx += (this.touch.dx / d) * (d - max); this.touch.sy += (this.touch.dy / d) * (d - max); this.touch.dx = (this.touch.dx / d) * max; this.touch.dy = (this.touch.dy / d) * max; }
    });
    const up = (e: PointerEvent) => { if (e.pointerId === this.touch.id) this.touch = { active: false, id: -1, sx: 0, sy: 0, dx: 0, dy: 0 }; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }

  togglePause() {
    this.paused = !this.paused;
    this.cb.onPauseToggle(this.paused);
    if (!this.paused) this.last = performance.now();
  }

  readInput() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('arrowleft') || k.has('a')) x -= 1;
    if (k.has('arrowright') || k.has('d')) x += 1;
    if (k.has('arrowup') || k.has('w')) y -= 1;
    if (k.has('arrowdown') || k.has('s')) y += 1;
    if (this.touch.active) {
      const d = Math.hypot(this.touch.dx, this.touch.dy);
      if (d > 6) { const m = clamp((d - 6) / 36, 0, 1); x = (this.touch.dx / d) * m; y = (this.touch.dy / d) * m; }
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.input = { x, y };
  }

  // ---------- loop ----------
  loop = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (!this.paused) this.update(dt);
    this.render();
  };

  update(dt: number) {
    this.readInput();
    if (this.hitstop > 0) { this.hitstop -= dt; this.updateFx(dt); return; }
    if (this.countdown > 0) {
      const prev = this.countdown; this.countdown -= dt;
      if (Math.ceil(prev * 2) !== Math.ceil(this.countdown * 2) && this.countdown > 0) sfx.tick();
      if (this.countdown <= 0) sfx.go();
      this.updateFx(dt); return;
    }
    if (this.over || this.done) { this.updateFx(dt); return; }
    this.time += dt;
    const P = this.params, pl = this.player;

    if (P.shrink) this.shrinkM = Math.min(130, this.time * 3.2);
    const minX = pl.r + this.shrinkM, maxX = this.W - pl.r - this.shrinkM, minY = pl.r + this.shrinkM, maxY = this.H - pl.r - this.shrinkM;

    // player movement — snappy
    const maxSp = 340;
    const k = 1 - Math.exp(-dt * 16);
    pl.vx += (this.input.x * maxSp - pl.vx) * k;
    pl.vy += (this.input.y * maxSp - pl.vy) * k;
    pl.x = clamp(pl.x + pl.vx * dt, minX, maxX);
    pl.y = clamp(pl.y + pl.vy * dt, minY, maxY);
    pl.rot += (Math.abs(pl.vx) + Math.abs(pl.vy)) * dt * 0.01;
    if (pl.inv > 0) pl.inv -= dt;
    pl.trail.unshift({ x: pl.x, y: pl.y }); if (pl.trail.length > 10) pl.trail.pop();

    // combo timer
    if (this.combo > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    // gems
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.pulse += dt * 4;
      if (g.pop < 1) g.pop = Math.min(1, g.pop + dt * 4);
      if (Math.hypot(g.x - pl.x, g.y - pl.y) < g.r + pl.r + 4) {
        this.gems.splice(i, 1);
        this.collected++;
        this.combo++; this.comboT = 2.2; this.maxCombo = Math.max(this.maxCombo, this.combo);
        const mult = Math.min(this.combo, this.chapter >= 3 ? 12 : 8);
        const pts = 10 * mult;
        this.score += pts;
        this.burst(g.x, g.y, 14, this.color, g.shape);
        this.texts.push({ x: g.x, y: g.y - 10, text: `+${pts}${mult > 1 ? ` x${mult}` : ''}`, life: 0.8, color: '#fff', size: mult > 4 ? 22 : 16 });
        this.shake = Math.max(this.shake, 3 + Math.min(mult, 8));
        sfx.collect(this.combo);
        if (this.collected >= P.target) { this.finish(); return; }
        if (this.gems.length < P.gemsAtOnce) this.spawnGem();
        // escalate: every 5 gems adds a bouncer
        if (this.collected % 5 === 0 && this.hazards.length < 14) this.spawnBouncer();
      }
    }

    // hazards
    for (const h of this.hazards) {
      if (h.kind === 'bouncer') {
        h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt;
        const m = this.shrinkM;
        if (h.x < h.r + m) { h.x = h.r + m; h.vx = Math.abs(h.vx); }
        if (h.x > this.W - h.r - m) { h.x = this.W - h.r - m; h.vx = -Math.abs(h.vx); }
        if (h.y < h.r + m) { h.y = h.r + m; h.vy = Math.abs(h.vy); }
        if (h.y > this.H - h.r - m) { h.y = this.H - h.r - m; h.vy = -Math.abs(h.vy); }
      } else if (h.kind === 'chaser') {
        const dx = pl.x - h.x, dy = pl.y - h.y, d = Math.hypot(dx, dy) || 1;
        const acc = 260 * P.speedMul, maxV = 170 * P.speedMul;
        h.vx += (dx / d) * acc * dt; h.vy += (dy / d) * acc * dt;
        const v = Math.hypot(h.vx, h.vy);
        if (v > maxV) { h.vx = (h.vx / v) * maxV; h.vy = (h.vy / v) * maxV; }
        h.x += h.vx * dt; h.y += h.vy * dt;
        h.rot = Math.atan2(h.vy, h.vx) + Math.PI / 2;
        if (Math.random() < dt * 20) this.particles.push({ x: h.x, y: h.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.4, max: 0.4, size: 3, color: '#f472b6', rot: 0, vr: 0 });
      } else {
        h.rot += dt * 1.5; h.cd -= dt;
        if (h.cd <= 0) {
          h.cd = h.interval;
          const dx = pl.x - h.x, dy = pl.y - h.y, d = Math.hypot(dx, dy) || 1;
          const sp = 230 * P.speedMul;
          this.bullets.push({ x: h.x, y: h.y, vx: (dx / d) * sp, vy: (dy / d) * sp, r: 6, life: 4 });
          this.burst(h.x, h.y, 5, '#fbbf24');
          sfx.shoot();
        }
      }
      if (this.hitTest(h.x, h.y, h.r * 0.85)) this.hurt();
    }

    // bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -10 || b.x > this.W + 10 || b.y < -10 || b.y > this.H + 10) { this.bullets.splice(i, 1); continue; }
      if (this.hitTest(b.x, b.y, b.r)) { this.bullets.splice(i, 1); this.hurt(); }
    }

    // lasers
    if (P.laserInterval) {
      this.laserCd -= dt;
      if (this.laserCd <= 0) {
        this.laserCd = P.laserInterval;
        const aim = Math.random() < 0.6;
        const x = aim ? pl.x : rand(60, this.W - 60), y = aim ? pl.y : rand(60, this.H - 60);
        this.lasers.push({ x, y, angle: rand(0, Math.PI), t: 0, warn: 0.9, fire: 0.45, sweep: rand(-0.5, 0.5) });
        sfx.laserWarn();
      }
    }
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const L = this.lasers[i]; L.t += dt;
      if (L.t > L.warn + L.fire) { this.lasers.splice(i, 1); continue; }
      if (L.t >= L.warn) {
        if (L.t - dt < L.warn) { sfx.laserFire(); this.shake = Math.max(this.shake, 6); }
        L.angle += L.sweep * dt;
        // distance from player to line
        const nx = -Math.sin(L.angle), ny = Math.cos(L.angle);
        const d = Math.abs((pl.x - L.x) * nx + (pl.y - L.y) * ny);
        if (d < pl.r * 0.8 + 6 && pl.inv <= 0) this.hurt();
      }
    }

    this.updateFx(dt);
  }

  hitTest(x: number, y: number, r: number) {
    const pl = this.player;
    return pl.inv <= 0 && Math.hypot(x - pl.x, y - pl.y) < r + pl.r * 0.8;
  }

  hurt() {
    const pl = this.player;
    pl.lives--; this.hits++;
    this.combo = 0;
    pl.inv = 1.4;
    this.shake = 18; this.flash = 0.6; this.hitstop = 0.08;
    this.burst(pl.x, pl.y, 26, '#ff5d5d');
    this.burst(pl.x, pl.y, 10, '#ffffff');
    this.texts.push({ x: pl.x, y: pl.y - 24, text: pl.lives > 0 ? '¡AUCH!' : 'K.O.', life: 1, color: '#ff5d5d', size: 26 });
    if (navigator.vibrate) navigator.vibrate(pl.lives > 0 ? 40 : 120);
    if (pl.lives <= 0) {
      sfx.death();
      this.over = true; this.shake = 30; this.hitstop = 0.25;
      this.burst(pl.x, pl.y, 60, this.color, this.skin);
      setTimeout(() => this.cb.onGameOver(this.score), 700);
    } else sfx.hit();
  }

  finish() {
    this.done = true;
    const timeBonus = Math.max(0, Math.round((75 - this.time) * 6));
    const lifeBonus = this.player.lives * 150;
    this.score += timeBonus + lifeBonus;
    const stars = this.hits === 0 ? 3 : this.hits === 1 ? 2 : 1;
    this.shake = 12;
    for (let i = 0; i < 4; i++) setTimeout(() => this.burst(rand(60, this.W - 60), rand(60, this.H - 60), 30, i % 2 ? this.color : this.color2, this.skin), i * 120);
    sfx.win();
    const r: LevelResult = { score: this.score, stars, time: this.time, maxCombo: this.maxCombo, livesLeft: this.player.lives };
    setTimeout(() => this.cb.onLevelComplete(r), 900);
  }

  burst(x: number, y: number, n: number, color: string, shape?: Shape) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(60, 320);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), max: 0.9, size: rand(2, 6), color, shape: shape && Math.random() < 0.3 ? shape : undefined, rot: rand(0, 6), vr: rand(-8, 8) });
    }
  }

  updateFx(dt: number) {
    this.shake *= Math.exp(-dt * 9); if (this.shake < 0.2) this.shake = 0;
    this.flash = Math.max(0, this.flash - dt * 1.6);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt; if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.rot += p.vr * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i]; t.life -= dt; t.y -= 40 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  // ---------- render ----------
  render() {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    ctx.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, (this.ox + sx * this.scale) * this.dpr, (this.oy + sy * this.scale) * this.dpr);

    // arena bg
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // shrink walls
    if (this.shrinkM > 0) {
      const m = this.shrinkM;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, m); ctx.fillRect(0, H - m, W, m); ctx.fillRect(0, m, m, H - 2 * m); ctx.fillRect(W - m, m, m, H - 2 * m);
      ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.shadowColor = this.color; ctx.shadowBlur = 14;
      ctx.strokeRect(m, m, W - 2 * m, H - 2 * m); ctx.shadowBlur = 0;
    }
    ctx.strokeStyle = this.color + '66'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

    // lasers
    for (const L of this.lasers) {
      const len = 2000, cx = Math.cos(L.angle) * len, cy = Math.sin(L.angle) * len;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(L.x - cx, L.y - cy); ctx.lineTo(L.x + cx, L.y + cy);
      if (L.t < L.warn) {
        const bl = Math.sin(L.t * 30) > 0 ? 0.7 : 0.3;
        ctx.setLineDash([12, 10]); ctx.strokeStyle = `rgba(167,139,250,${bl})`; ctx.lineWidth = 2; ctx.stroke();
      } else {
        ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 25; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 14; ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
      }
      ctx.restore();
    }

    // gems
    for (const g of this.gems) {
      const s = (0.5 + 0.5 * Math.sin(Math.PI * g.pop - Math.PI / 2)) * (1.3 - 0.3 * g.pop);
      const r = g.r * s * (1 + 0.12 * Math.sin(g.pulse));
      ctx.save();
      ctx.shadowColor = this.color; ctx.shadowBlur = 18;
      ctx.fillStyle = this.color2; drawShape(ctx, g.shape, g.x, g.y, r, g.pulse * 0.5); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      drawShape(ctx, g.shape, g.x, g.y, r + 6 + 3 * Math.sin(g.pulse * 1.3), -g.pulse * 0.3); ctx.stroke();
      ctx.restore();
    }

    // hazards
    for (const h of this.hazards) {
      ctx.save();
      if (h.kind === 'bouncer') {
        ctx.fillStyle = '#ff5d5d'; ctx.shadowColor = '#ff5d5d'; ctx.shadowBlur = 12;
        drawShape(ctx, h.shape, h.x, h.y, h.r, h.rot); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#2a0a0a'; drawShape(ctx, h.shape, h.x, h.y, h.r * 0.5, h.rot); ctx.fill();
      } else if (h.kind === 'chaser') {
        ctx.fillStyle = '#f472b6'; ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 16;
        drawShape(ctx, 'triangle', h.x, h.y, h.r + 3, h.rot); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h.x, h.y, 3, 0, 7); ctx.fill();
      } else {
        const charge = 1 - clamp(h.cd / h.interval, 0, 1);
        ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10 + charge * 20;
        drawShape(ctx, 'square', h.x, h.y, h.r, h.rot); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#2a1a00'; drawShape(ctx, 'square', h.x, h.y, h.r * 0.55, -h.rot); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${charge})`; ctx.beginPath(); ctx.arc(h.x, h.y, 3 + charge * 4, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    for (const b of this.bullets) {
      ctx.fillStyle = '#fde68a'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }

    // player
    const pl = this.player;
    if (!this.over) {
      for (let i = pl.trail.length - 1; i >= 0; i--) {
        const t = pl.trail[i], a = (1 - i / pl.trail.length) * 0.35;
        ctx.fillStyle = this.hex(this.color, a);
        drawShape(ctx, this.skin, t.x, t.y, pl.r * (1 - i / pl.trail.length) * 0.9, pl.rot); ctx.fill();
      }
      const blink = pl.inv > 0 && Math.sin(pl.inv * 40) > 0;
      ctx.save();
      ctx.globalAlpha = blink ? 0.35 : 1;
      ctx.shadowColor = this.color; ctx.shadowBlur = 22;
      const sq = 1 + Math.min(0.25, Math.hypot(pl.vx, pl.vy) / 1400);
      ctx.translate(pl.x, pl.y); ctx.rotate(Math.atan2(pl.vy, pl.vx)); ctx.scale(sq, 1 / sq); ctx.rotate(-Math.atan2(pl.vy, pl.vx));
      ctx.fillStyle = '#fff'; drawShape(ctx, this.skin, 0, 0, pl.r + 2, pl.rot); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = this.color; drawShape(ctx, this.skin, 0, 0, pl.r - 3, pl.rot); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, -3, 2.5, 0, 7); ctx.arc(4, -3, 2.5, 0, 7); ctx.fill();
      ctx.restore();
      if (pl.inv > 0 && this.countdown <= 0) {
        ctx.strokeStyle = this.hex('#ffffff', 0.4); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r + 10, 0, Math.PI * 2 * (pl.inv / 1.4)); ctx.stroke();
      }
    }

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      if (p.shape) { drawShape(ctx, p.shape, p.x, p.y, p.size * 1.6, p.rot); ctx.fill(); }
      else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    // texts
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = clamp(t.life * 1.5, 0, 1);
      ctx.font = `900 ${t.size}px system-ui, sans-serif`;
      ctx.fillStyle = '#000'; ctx.fillText(t.text, t.x + 2, t.y + 2);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // touch joystick
    if (this.touch.active) {
      const jx = (this.touch.sx - this.ox) / this.scale, jy = (this.touch.sy - this.oy) / this.scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(jx, jy, 48 / this.scale, 0, 7); ctx.stroke();
      ctx.fillStyle = this.hex(this.color, 0.6);
      ctx.beginPath(); ctx.arc(jx + this.touch.dx / this.scale, jy + this.touch.dy / this.scale, 20 / this.scale, 0, 7); ctx.fill();
    }

    this.renderHud();

    if (this.flash > 0) { ctx.fillStyle = `rgba(255,40,40,${this.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    if (this.countdown > 0) {
      const n = Math.ceil(this.countdown * 2);
      const label = n > 1 ? String(n - 1) : '¡YA!';
      const frac = (this.countdown * 2) % 1;
      ctx.globalAlpha = 0.9;
      ctx.font = `900 ${90 + frac * 40}px system-ui, sans-serif`; ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 30;
      ctx.fillText(label, W / 2, H / 2 - 20); ctx.shadowBlur = 0;
      ctx.font = '700 18px system-ui, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(`Recoge ${this.params.target} ${CHAPTERS[this.chapter - 1].name.toLowerCase()} · esquiva lo rojo`, W / 2, H / 2 + 50);
      ctx.globalAlpha = 1;
    }
  }

  renderHud() {
    const ctx = this.ctx, W = this.W, P = this.params;
    // progress bar
    const bw = Math.min(360, W - 40), bx = (W - bw) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.rr(bx, 12, bw, 14, 7); ctx.fill();
    const frac = clamp(this.collected / P.target, 0, 1);
    ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10; this.rr(bx, 12, bw * frac, 14, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = '800 12px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${this.collected} / ${P.target}`, W / 2, 19);
    // level label
    ctx.textAlign = 'left'; ctx.font = '800 13px system-ui, sans-serif'; ctx.fillStyle = this.hex('#ffffff', 0.7);
    ctx.fillText(`CAP ${this.chapter} · NIVEL ${this.level}`, 14, 20);
    // lives
    for (let i = 0; i < P.lives; i++) {
      ctx.fillStyle = i < this.player.lives ? '#ff5d7a' : 'rgba(255,255,255,0.15)';
      drawShape(ctx, 'hexagon', 22 + i * 22, 44, 8, 0); ctx.fill();
    }
    // score
    ctx.textAlign = 'right'; ctx.font = '900 22px system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(String(this.score).padStart(6, '0'), W - 14, 22);
    if (this.combo > 1) {
      const m = Math.min(this.combo, this.chapter >= 3 ? 12 : 8);
      ctx.font = `900 ${16 + m}px system-ui, sans-serif`; ctx.fillStyle = this.color2;
      ctx.fillText(`x${m}`, W - 14, 50);
      ctx.fillStyle = this.hex(this.color, 0.8); ctx.fillRect(W - 14 - 80 * (this.comboT / 2.2), 66, 80 * (this.comboT / 2.2), 3);
    }
    ctx.textAlign = 'center';
  }

  rr(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx; const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr); ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
  }
  hex(c: string, a: number) {
    const n = parseInt(c.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
}
