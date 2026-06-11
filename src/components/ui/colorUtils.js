const HEX6_RE = /^#?[0-9a-fA-F]{6}$/;
const HEX3_RE = /^#?[0-9a-fA-F]{3}$/;

function expand3(hex) {
  const c = hex.replace(/^#/, "");
  return "#" + c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
}

/** Normalize any hex variant to "#RRGGBB" (uppercase). Returns null if invalid. */
export function normalizeHex(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (HEX6_RE.test(s)) return ("#" + s.replace(/^#/, "")).toUpperCase();
  if (HEX3_RE.test(s)) return expand3(s).toUpperCase();
  return null;
}

/**
 * Hex → HSV. Returns { h: 0–360, s: 0–100, v: 0–100 } (floating-point) or null if invalid.
 * Uses float HSV to avoid round-trip rounding errors when converting back to hex.
 */
export function hexToHsv(hex) {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  const r = parseInt(norm.slice(1, 3), 16) / 255;
  const g = parseInt(norm.slice(3, 5), 16) / 255;
  const b = parseInt(norm.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max * 100;
  const s = max === 0 ? 0 : (d / max) * 100;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: h % 360, s, v };
}

/** HSV → "#RRGGBB" (uppercase). h: 0–360, s: 0–100, v: 0–100. */
export function hsvToHex(h, s, v) {
  const sv = s / 100;
  const vv = v / 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => vv * (1 - sv * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const bl = Math.round(f(1) * 255);
  return "#" + [r, g, bl].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
