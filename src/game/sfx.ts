let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) { muted = m; }
export function unlockAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slide = 0) {
  if (muted || !ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  collect(combo: number) { tone(440 + Math.min(combo, 12) * 55, 0.12, 'triangle', 0.18, 200); },
  hit() { tone(140, 0.35, 'sawtooth', 0.25, -100); tone(70, 0.4, 'square', 0.15, -40); },
  death() { tone(220, 0.6, 'sawtooth', 0.25, -200); },
  laserWarn() { tone(880, 0.08, 'square', 0.05); },
  laserFire() { tone(200, 0.3, 'sawtooth', 0.12, 600); },
  shoot() { tone(600, 0.08, 'square', 0.05, -300); },
  go() { tone(660, 0.15, 'triangle', 0.2); setTimeout(() => tone(990, 0.25, 'triangle', 0.2), 120); },
  tick() { tone(520, 0.07, 'triangle', 0.12); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.2), i * 90)); },
  reward() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.45, 'sine', 0.22), i * 110)); },
  click() { tone(800, 0.05, 'triangle', 0.08); },
};
