export function hsbToHex(h, s, b) {
  s /= 100; b /= 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => b - b * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const bl = Math.round(f(1) * 255);
  return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => b - b * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255),
  };
}

export function hsbToInt(h, s, bri, a = 1) {
  const { r, g, b } = hsbToRgb(h, s, bri);
  return Phaser.Display.Color.GetColor32(r, g, b, Math.round(a * 255));
}

export function isHueSafe(blockHue, playerHue, range) {
  const diff = Math.abs(blockHue - playerHue) % 360;
  const d = diff > 180 ? 360 - diff : diff;
  return d < range;
}

export function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const dx = Math.max(0, Math.abs(cx - rx) - rw / 2);
  const dy = Math.max(0, Math.abs(cy - ry) - rh / 2);
  return dx * dx + dy * dy < r * r;
}

export function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
