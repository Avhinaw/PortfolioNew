export type Ctx = CanvasRenderingContext2D;

export function R(c: Ctx, x: number, y: number, w: number, h: number, col: string) { c.fillStyle = col; c.fillRect(x, y, w, h); }

export function hash(x: number, y: number, s = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const shadeCache = new Map<string, string>();
/** f<1 darkens, f>1 lightens. Accepts #rrggbb. */
export function shade(hex: string, f: number) {
  const k = hex + f;
  const hit = shadeCache.get(k);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const out = `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  shadeCache.set(k, out);
  return out;
}

// 3x5 bitmap font
const RAW: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010100100', '8': '111101111101111',
  '9': '111101111001110', ':': '000010000010000', '-': '000000111000000', '!': '010010010000010', '?': '110001010000010',
  '.': '000000000000010', '>': '100010001010100', '<': '001010100010001', '&': '010101010101011', ' ': '000000000000000',
};
export const textW = (s: string, scale = 1) => Math.max(0, s.length * 4 * scale - scale);

export function text(c: Ctx, s: string, x: number, y: number, col: string, scale = 1, shadow?: string) {
  const str = s.toUpperCase();
  for (let pass = shadow ? 0 : 1; pass < 2; pass++) {
    let cx = x;
    for (const ch of str) {
      const g = RAW[ch];
      if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') {
        const gx = cx + (i % 3) * scale, gy = y + ((i / 3) | 0) * scale;
        if (pass === 0) R(c, gx, gy + scale, scale, scale, shadow!); else R(c, gx, gy, scale, scale, col);
      }
      cx += 4 * scale;
    }
  }
}

export function bubble(c: Ctx, s: string, x: number, y: number, bg = '#ffffff', fg = '#161616') {
  const w = textW(s) + 5, h = 9, bx = x - (w >> 1), by = y - h - 3;
  R(c, bx - 1, by, w + 2, h, '#161616'); R(c, bx, by - 1, w, h + 2, '#161616');
  R(c, bx, by, w, h, bg);
  R(c, x - 1, by + h + 1, 3, 1, '#161616'); R(c, x, by + h + 2, 1, 1, '#161616'); R(c, x, by + h, 1, 1, bg);
  text(c, s, bx + 3, by + 2, fg);
}
