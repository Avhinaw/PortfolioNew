import type { Rect, Vec2 } from './types';

// ---- world: 64 x 48 tiles, 32px each (2048 x 1536 world px) ----
export const TILE = 32, COLS = 64, ROWS = 48;
export const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
export type Lv = 0 | 1; // 0 = ground, 1 = foot-over-bridge deck

export const PLATFORM_IDS = [1, 2, 3];
/** Platform rows (y0..y1) and the track band north of it where its train berths (ty0..ty1). */
export const PF: Record<number, { y0: number; y1: number; ty0: number; ty1: number }> = {
  1: { y0: 25, y1: 29, ty0: 21, ty1: 24 },
  2: { y0: 16, y1: 20, ty0: 12, ty1: 15 },
  3: { y0: 7, y1: 11, ty0: 3, ty1: 6 },
};
export const PX0 = 6, PX1 = 57;
export const FOB: Rect = [30, 4, 33, 31];
export const HALL: Rect = [4, 31, 59, 40];
export const FORECOURT: Rect = [4, 42, 59, 45];

export const ZONES: Record<string, { r: Rect; lv: Lv }> = {
  fob: { r: FOB, lv: 1 }, fobN: { r: [30, 4, 33, 12], lv: 1 }, fobMid: { r: [30, 13, 33, 15], lv: 1 }, fobS: { r: [30, 21, 33, 31], lv: 1 },
  pf1: { r: [PX0, 25, PX1, 29], lv: 0 }, pf2: { r: [PX0, 16, PX1, 20], lv: 0 }, pf3: { r: [PX0, 7, PX1, 11], lv: 0 },
  hall: { r: HALL, lv: 0 }, booking: { r: [7, 33, 20, 39], lv: 0 }, canteen: { r: [40, 31, 52, 40], lv: 0 },
  stairP1: { r: [24, 25, 31, 29], lv: 0 }, stairP2: { r: [24, 16, 31, 20], lv: 0 }, stairP3: { r: [24, 7, 31, 11], lv: 0 },
  gateW: { r: [8, 30, 11, 30], lv: 0 }, gateE: { r: [52, 30, 55, 30], lv: 0 },
  nap: { r: [20, 17, 23, 19], lv: 0 },
};

export const POI = {
  board: { x: 23.5 * TILE, y: 34 * TILE },            // train indicator board (object centre)
  boardStand: { x: 23.5 * TILE, y: 36.5 * TILE },
  counter: { x: 8.5 * TILE, y: 36 * TILE },           // booking windows (west wall) - stand in front
  food: { x: 51.5 * TILE, y: 36 * TILE },             // canteen (east wall)
  wait: { x: 30 * TILE, y: 37 * TILE },
  spawn: { x: 14.5 * TILE, y: 44 * TILE },
};
export const BAG_SPOTS: Vec2[] = [
  { x: 7.5 * TILE, y: 44 * TILE }, { x: 12.5 * TILE, y: 43 * TILE }, { x: 18.5 * TILE, y: 44 * TILE }, { x: 23.5 * TILE, y: 43 * TILE },
];

export const inRect = (tx: number, ty: number, r: Rect) => tx >= r[0] && tx <= r[2] && ty >= r[1] && ty <= r[3];
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const tileOf = (p: Vec2) => ({ tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) });
const ctr = (tx: number, ty: number): Vec2 => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });

// ---- grids ----
const g = new Uint8Array(COLS * ROWS), b = new Uint8Array(COLS * ROWS);
const fill = (a: Uint8Array, r: Rect, v = 1) => { for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) a[y * COLS + x] = v; };
for (const p of PLATFORM_IDS) fill(g, [PX0, PF[p].y0, PX1, PF[p].y1]);
fill(g, HALL); fill(g, FORECOURT);
fill(g, [8, 30, 11, 30]); fill(g, [52, 30, 55, 30]);       // platform-1 gates
fill(g, [12, 41, 19, 41]); fill(g, [46, 41, 49, 41]);      // entrances
fill(g, [4, 33, 6, 39], 0);                                // booking counters
fill(g, [53, 33, 59, 39], 0);                              // canteen counters
fill(g, [22, 34, 25, 34], 0);                              // train-indicator board kiosk
fill(g, [34, 32, 35, 34], 0);                              // main lift tower
for (const p of PLATFORM_IDS) fill(g, [34, PF[p].y0 + 1, 35, PF[p].y0 + 3], 0); // platform lift towers
fill(b, FOB);

export const isWalk = (tx: number, ty: number, lv: Lv = 0) =>
  tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && (lv === 0 ? g : b)[ty * COLS + tx] === 1;

// ---- stairs & lifts between ground (a) and the footbridge deck (b) ----
export interface Link { id: string; kind: 'stairs' | 'lift'; a: Vec2; b: Vec2; platform: number; secs: number }
export const LINKS: Link[] = [];
for (const p of [0, 1, 2, 3]) {
  const ym = p === 0 ? 33 : PF[p].y0 + 2, by = p === 0 ? 30 : ym;
  LINKS.push({ id: `stairs${p}`, kind: 'stairs', a: ctr(28, ym), b: ctr(30, by), platform: p, secs: 4 });
  LINKS.push({ id: `lift${p}`, kind: 'lift', a: ctr(36, ym), b: ctr(33, by), platform: p, secs: 7 });
}

// ---- train geometry ----
export const COACH_NAMES = ['PC', 'S4', 'S3', 'S2', 'S1']; // west -> east, loco at the east end
export const COACH_STRIDE = 196;                            // world px per vehicle (96 internal + 2 gap)
export const TRAIN_LEN = 6 * COACH_STRIDE;
export const TRAIN_LEFT_MIN = 200, TRAIN_LEFT_MAX = PX1 * TILE + TILE - TRAIN_LEN - 8;
export function doorWorld(left: number, plat: number, i: number): Vec2 {
  return { x: left + Math.floor(i / 2) * COACH_STRIDE + (i % 2 ? 144 : 48), y: (PF[plat].y0 + 0.9) * TILE };
}
/** Where friends loiter before the train shows up: near the stairs of that platform. */
export const platformWait = (p: number): Vec2 => ctr(26, PF[p].y0 + 2);

// ---- navigation (Dijkstra across levels, with stairs/lifts as costed edges) ----
export interface WP { x: number; y: number; lv: Lv; link?: number; dir?: 1 | -1 }
export interface Nav {
  blocked: (tx: number, ty: number, lv: Lv) => boolean;
  linkOk: (li: number, dir: 1 | -1) => boolean;
  linkCost: (li: number) => number;
}
const N = COLS * ROWS;
const heap: number[] = [], hcost: number[] = [];
const push = (n: number, c: number) => { let i = heap.length; heap.push(n); hcost.push(c); while (i > 0) { const p = (i - 1) >> 1; if (hcost[p] <= hcost[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hcost[p], hcost[i]] = [hcost[i], hcost[p]]; i = p; } };
const pop = () => { const n = heap[0], c = hcost[0], ln = heap.pop()!, lc = hcost.pop()!; if (heap.length) { heap[0] = ln; hcost[0] = lc; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && hcost[l] < hcost[m]) m = l; if (r < heap.length && hcost[r] < hcost[m]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; [hcost[m], hcost[i]] = [hcost[i], hcost[m]]; i = m; } } return [n, c] as const; };

export function findPath(from: Vec2, fromLv: Lv, to: Vec2, toLv: Lv, nav: Nav): WP[] | null {
  const s = tileOf(from), t = tileOf(to);
  if (!isWalk(t.tx, t.ty, toLv) || nav.blocked(t.tx, t.ty, toLv)) return null;
  const sn = fromLv * N + s.ty * COLS + s.tx, tn = toLv * N + t.ty * COLS + t.tx;
  const cost = new Float32Array(N * 2).fill(Infinity), prev = new Int32Array(N * 2).fill(-1), via = new Int16Array(N * 2).fill(-1);
  heap.length = 0; hcost.length = 0;
  cost[sn] = 0; push(sn, 0);
  while (heap.length) {
    const [n, c] = pop();
    if (c > cost[n]) continue;
    if (n === tn) break;
    const lv = (n >= N ? 1 : 0) as Lv, m = n % N, x = m % COLS, y = (m / COLS) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!isWalk(nx, ny, lv) || nav.blocked(nx, ny, lv)) continue;
      const k = lv * N + ny * COLS + nx;
      if (c + 1 < cost[k]) { cost[k] = c + 1; prev[k] = n; via[k] = -1; push(k, c + 1); }
    }
    for (let li = 0; li < LINKS.length; li++) {
      const l = LINKS[li], pa = tileOf(l.a), pb = tileOf(l.b);
      let k = -1, dir: 1 | -1 = 1;
      if (lv === 0 && pa.tx === x && pa.ty === y) { k = N + pb.ty * COLS + pb.tx; dir = 1; }
      else if (lv === 1 && pb.tx === x && pb.ty === y) { k = pa.ty * COLS + pa.tx; dir = -1; }
      if (k < 0 || !nav.linkOk(li, dir)) continue;
      const nc = c + nav.linkCost(li);
      if (nc < cost[k]) { cost[k] = nc; prev[k] = n; via[k] = li; push(k, nc); }
    }
  }
  if (!isFinite(cost[tn])) return null;
  const chain: number[] = [];
  for (let n = tn; n !== -1 && n !== sn; n = prev[n]) chain.push(n);
  chain.reverse();
  const out: WP[] = [];
  let before = sn;
  for (const n of chain) {
    const lv = (n >= N ? 1 : 0) as Lv, m = n % N;
    if (via[n] >= 0) {
      const li = via[n], l = LINKS[li], up = before < N;
      out.push({ x: (up ? l.a : l.b).x, y: (up ? l.a : l.b).y, lv: up ? 0 : 1, link: li, dir: up ? 1 : -1 });
    } else out.push({ ...ctr(m % COLS, (m / COLS) | 0), lv });
    before = n;
  }
  return out;
}

/** Ground-only BFS for ambient commuters. */
export function findPathGround(from: Vec2, to: Vec2): Vec2[] | null {
  const s = tileOf(from), t = tileOf(to);
  if (!isWalk(t.tx, t.ty)) return null;
  const prev = new Int32Array(N).fill(-2), q: number[] = [s.ty * COLS + s.tx];
  prev[q[0]] = -1;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], x = c % COLS, y = (c / COLS) | 0;
    if (x === t.tx && y === t.ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!isWalk(nx, ny)) continue;
      const k = ny * COLS + nx;
      if (prev[k] !== -2) continue;
      prev[k] = c; q.push(k);
    }
  }
  const tk = t.ty * COLS + t.tx;
  if (prev[tk] === -2) return null;
  const out: Vec2[] = [];
  for (let c = tk; c !== -1 && c !== s.ty * COLS + s.tx; c = prev[c]) out.push(ctr(c % COLS, (c / COLS) | 0));
  return out.reverse();
}
