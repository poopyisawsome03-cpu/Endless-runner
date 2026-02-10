/* ===== UTILITY HELPERS ===== */

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rng(lo, hi) { return lo + Math.random() * (hi - lo); }

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; }

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getSpeed() {
  return Math.min(run.max, run.base + run.dist * run.scale);
}
