import { COLS, FORECOURT, HALL, LINKS, PF, PLATFORM_IDS, PX0, PX1, ROWS, isWalk } from '@/game/map';
import { R, hash, shade, text, type Ctx } from './pixel';
import { drawClock, drawLamp, drawStairsFlight, drawTree } from './sprites';

export const SW = COLS * 16, SH = ROWS * 16; // internal px (1 internal px = 2 world px)

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv;
}

function bldg(c: Ctx, x: number, y: number, w: number, h: number, col: string, seed: number) {
  R(c, x + 3, y + 3, w, h, 'rgba(0,0,0,0.25)');
  R(c, x, y, w, h, col); R(c, x, y, w, 4, shade(col, 0.7)); R(c, x, y + 4, w, 1, shade(col, 1.2));
  for (let wy = y + 9; wy < y + h - 6; wy += 10) for (let wx = x + 4; wx < x + w - 6; wx += 9) {
    const lit = hash(wx, wy, seed) > 0.55;
    R(c, wx, wy, 5, 6, lit ? '#ffd98a' : '#2f3a4a'); R(c, wx, wy + 6, 5, 1, shade(col, 0.6));
  }
  if (hash(seed, 3, 3) > 0.5) { R(c, x + 4, y - 7, 8, 7, '#6b7480'); R(c, x + 4, y - 8, 8, 1, '#8a929c'); }
}

function ground(c: Ctx) {
  R(c, 0, 0, SW, SH, '#3a5f3b');
  for (let i = 0; i < 3000; i++) R(c, Math.floor(hash(i, 1) * SW), Math.floor(hash(i, 2) * SH), 1, 1, hash(i, 3) > 0.5 ? '#44744a' : '#2e4f31');
  // city skyline around the station
  const cols = ['#b5654a', '#c9a45a', '#7a8fa8', '#b8b2a0', '#9a6a8a', '#6a9a8a', '#d08a4a'];
  for (let x = 0, i = 0; x < SW; x += 50 + (i % 3) * 8, i++) bldg(c, x, 6, 46, 34 + (i % 4) * 3, cols[i % 7], i);
  for (let y = 56, i = 20; y < SH - 90; y += 70, i++) { bldg(c, 2, y, 54, 62, cols[i % 7], i); bldg(c, SW - 58, y + 10, 54, 62, cols[(i + 3) % 7], i + 9); }
  // fences + trees at the platform ends
  for (const p of PLATFORM_IDS) for (const x of [64, 928]) { R(c, x, PF[p].y0 * 16, 28, 80, '#5a6a5a'); R(c, x, PF[p].y0 * 16, 28, 2, '#8a9a8a'); }
}

function track(c: Ctx, p: number) {
  const y = PF[p].ty0 * 16;
  R(c, 0, y, SW, 64, '#6b6258');
  for (let i = 0; i < 600; i++) R(c, Math.floor(hash(i, p) * SW), y + Math.floor(hash(i, p + 9) * 64), 1, 1, hash(i, 6) > 0.5 ? '#7d7366' : '#564e45');
  for (let x = 0; x < SW; x += 6) R(c, x, y + 10, 3, 44, '#4a3a2e');
  R(c, 0, y + 17, SW, 2, '#9aa0a6'); R(c, 0, y + 17, SW, 1, '#d2d7dc'); R(c, 0, y + 43, SW, 2, '#9aa0a6'); R(c, 0, y + 43, SW, 1, '#d2d7dc');
  R(c, 0, y + 30, SW, 1, 'rgba(20,20,30,0.55)'); // overhead wire
  for (let x = 24; x < SW; x += 128) { R(c, x, y + 2, 2, 20, '#2a2a30'); R(c, x - 5, y + 6, 12, 1, '#2a2a30'); }
  for (let x = 140; x < SW; x += 330) { R(c, x, y + 50, 2, 14, '#2a2a30'); R(c, x - 1, y + 48, 4, 4, hash(x, p) > 0.5 ? '#3cdc5a' : '#e03c3c'); }
  R(c, 88, y + 14, 5, 34, '#b5302a'); R(c, 88, y + 14, 5, 3, '#e8c13a');
}

function platform(c: Ctx, p: number) {
  const { y0, y1 } = PF[p];
  for (let ty = y0; ty <= y1; ty++) for (let tx = PX0; tx <= PX1; tx++) {
    const x = tx * 16, y = ty * 16;
    R(c, x, y, 16, 16, (tx + ty) % 2 ? '#c8b79a' : '#cdbc9f');
    for (let i = 0; i < 8; i++) R(c, x + Math.floor(hash(i, tx, ty) * 16), y + Math.floor(hash(i, ty, tx + 5) * 16), 1, 1, hash(i, tx, ty + 9) > 0.5 ? '#b3a284' : '#dccfb4');
    R(c, x, y + 15, 16, 1, '#bba98b');
    if (tx >= 9 && tx <= 54 && ty >= y0 + 2 && ty <= y0 + 3) R(c, x, y, 16, 16, 'rgba(40,30,60,0.10)'); // canopy shade
    if (ty === y0) { R(c, x, y + 1, 16, 2, '#e8c13a'); for (let d = 0; d < 16; d += 4) R(c, x + d, y + 4, 2, 1, '#b8a888'); }
    if (ty === y1 && p !== 1) { R(c, x, y + 12, 16, 2, '#e8c13a'); R(c, x, y + 15, 16, 1, '#7a6d54'); }
  }
  const ym = (y0 + 2) * 16 + 2;
  for (const cx of [190, 700]) { text(c, String(p), cx - 6, ym, '#f4efe4', 4, '#9b8a6c'); text(c, 'PLATFORM', cx - 17, ym - 9, '#f4efe4', 1, '#9b8a6c'); }
}

function hallFloor(c: Ctx) {
  const tile = (tx: number, ty: number) => { const x = tx * 16, y = ty * 16, a = (tx + ty) % 2 === 0; R(c, x, y, 16, 16, a ? '#e6d9b8' : '#d8c9a2'); R(c, x, y, 16, 1, '#efe5c9'); R(c, x, y, 1, 16, '#efe5c9'); };
  for (let ty = HALL[1]; ty <= HALL[3]; ty++) for (let tx = HALL[0]; tx <= HALL[2]; tx++) tile(tx, ty);
  for (const [a, b, y] of [[8, 11, 30], [52, 55, 30], [12, 19, 41], [46, 49, 41]]) for (let tx = a; tx <= b; tx++) tile(tx, y);
  for (let ty = FORECOURT[1]; ty <= FORECOURT[3]; ty++) for (let tx = FORECOURT[0]; tx <= FORECOURT[2]; tx++) {
    const x = tx * 16, y = ty * 16;
    R(c, x, y, 16, 16, (tx + ty) % 2 ? '#a8a08e' : '#b0a894'); R(c, x, y, 16, 1, '#bfb7a2');
  }
  // parking bay lines and planters on the forecourt
  for (let x = 330; x < 900; x += 40) R(c, x, 704, 2, 28, '#e8e4d8');
  for (const x of [80, 300, 520, 760, 920]) { R(c, x, 724, 30, 8, '#6b4a2e'); R(c, x + 2, 722, 26, 3, '#3f7a44'); }
}

function walls(c: Ctx) {
  const wall = (x: number, y: number, w: number) => { R(c, x, y, w, 16, '#e4d6b4'); R(c, x, y, w, 2, '#c9b78e'); R(c, x, y + 12, w, 4, '#8a6f4a'); };
  // row 30: hall <-> platform 1 (two gates), row 41: front wall (two entrances)
  wall(64, 480, 64); wall(192, 480, 640); wall(880, 480, 80);
  wall(64, 656, 128); wall(320, 656, 416); wall(784, 656, 176);
  for (const gx of [128, 832]) { R(c, gx - 4, 478, 4, 20, '#333840'); R(c, gx + 64, 478, 4, 20, '#333840'); R(c, gx - 4, 478, 72, 3, '#c8321e'); text(c, 'PLATFORM 1', gx + 8, 483, '#ffffff'); }
  for (const dx of [192, 736]) { R(c, dx - 3, 654, 4, 20, '#333840'); R(c, dx + 128 * (dx < 400 ? 1 : 0.5) - 1, 654, 4, 20, '#333840'); }
  text(c, 'MAIN ENTRANCE', 214, 660, '#8a6f4a'); text(c, 'EXIT', 750, 660, '#8a6f4a');
  R(c, 3 * 16, 480, 16, 192, '#c9b78e'); R(c, 60 * 16, 480, 16, 192, '#c9b78e');
  // station name board + clock on the platform-side wall
  R(c, 354, 482, 140, 13, '#161616'); R(c, 355, 483, 138, 11, '#e8c13a'); text(c, 'LAST CALL JUNCTION', 359, 486, '#161616');
  drawClock(c, 520, 489);
}

function furniture(c: Ctx) {
  // booking office along the west wall
  R(c, 64, 528, 48, 112, '#6b4a2e'); R(c, 64, 528, 48, 3, '#8a6038');
  for (let i = 0; i < 4; i++) { R(c, 100, 536 + i * 26, 12, 18, '#8fc6d8'); R(c, 100, 536 + i * 26, 12, 2, '#c4e6f0'); R(c, 98, 556 + i * 26, 16, 3, '#3a2a20'); }
  R(c, 62, 512, 54, 14, '#1d2a38'); text(c, 'BOOKING OFFICE', 64, 516, '#ffd23f');
  for (let y = 536; y < 640; y += 12) R(c, 122, y, 2, 6, '#c8a030'); // queue rail posts
  R(c, 122, 536, 2, 100, 'rgba(200,160,48,0.5)');
  // canteen along the east wall
  R(c, 848, 528, 112, 112, '#8a5a36'); R(c, 848, 528, 112, 3, '#a8743f');
  for (let i = 0; i < 4; i++) { R(c, 850, 538 + i * 26, 14, 18, '#c8ccd2'); R(c, 852, 534 + i * 26, 10, 3, '#e8f0f4'); }
  R(c, 846, 510, 116, 14, '#d6453d'); text(c, 'CANTEEN: CHAI SAMOSA', 850, 514, '#ffffff');
  // train indicator board posts + label
  R(c, 348, 560, 72, 2, 'rgba(0,0,0,0.2)');
  // hall decoration: big pillars
  for (const x of [200, 480, 800]) { R(c, x, 592, 12, 40, '#b5a888'); R(c, x, 592, 3, 40, '#d4c8aa'); R(c, x - 2, 630, 16, 4, '#8a7d62'); }
  // wayfinding painted on the floor
  text(c, 'PLATFORM 1 >', 140, 508, '#8a7d62'); text(c, 'PLATFORMS 2 & 3 >', 520, 560, '#8a7d62'); text(c, 'FOOTBRIDGE', 462, 548, '#8a7d62');
  text(c, 'ENTRY', 186, 690, '#8a7d62');
}

function connectors(c: Ctx) {
  // shadow of the footbridge on the ground
  R(c, 488, 74, 64, 440, 'rgba(10,10,30,0.28)');
  for (const l of LINKS) {
    const ax = l.a.x / 2, ay = l.a.y / 2;
    if (l.kind === 'stairs') drawStairsFlight(c, Math.round(ax) + 4, Math.round(ay) - 20, 20, 40, 'STAIRS');
    else { text(c, 'LIFT', Math.round(ax) - 8, Math.round(ay) + 12, '#ffd23f', 1, '#161616'); R(c, Math.round(ax) - 8, Math.round(ay) - 6, 3, 3, '#ffd23f'); }
  }
}

export function buildGround(): HTMLCanvasElement {
  const cv = makeCanvas(SW, SH), c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  ground(c);
  for (const p of PLATFORM_IDS) track(c, p);
  for (const p of PLATFORM_IDS) platform(c, p);
  hallFloor(c); walls(c); furniture(c); connectors(c);
  // road along the bottom
  R(c, 0, 733, SW, 1, '#d8d0bc'); R(c, 0, 734, SW, 34, '#3b3b44');
  for (let x = 0; x < SW; x += 40) R(c, x, 751, 20, 1, '#e6c84f');
  const trees: [number, number][] = [[20, 300], [30, 460], [20, 600], [1000, 280], [1000, 520], [1000, 680], [60, 520], [980, 400]];
  trees.forEach(([x, y], i) => drawTree(c, x, y, i));
  for (const x of [120, 420, 640, 900]) drawLamp(c, x, 738);
  void isWalk; void ROWS; void PX1;
  return cv;
}

/** Footbridge deck: drawn over the platforms so people on the ground pass beneath it. */
export function buildDeck(): HTMLCanvasElement {
  const cv = makeCanvas(SW, SH), c = cv.getContext('2d')!;
  const x = 480, y = 64, w = 64, h = 448;
  R(c, x, y, w, h, '#5c6874');
  for (let yy = y; yy < y + h; yy += 6) R(c, x, yy, w, 1, '#505b66');
  for (let yy = y; yy < y + h; yy += 3) R(c, x + 3 + Math.floor(hash(yy, 1) * (w - 8)), yy, 2, 1, '#6e7a86');
  R(c, x, y, 3, h, '#e8b030'); R(c, x + w - 3, y, 3, h, '#e8b030');
  for (let yy = y; yy < y + h; yy += 24) { R(c, x - 1, yy, 5, 3, '#c89020'); R(c, x + w - 4, yy, 5, 3, '#c89020'); }
  for (let yy = y + 32; yy < y + h; yy += 64) { R(c, x, yy, w, 2, 'rgba(30,30,40,0.35)'); } // roof trusses
  R(c, x - 8, y - 12, 80, 12, '#1f5fa8'); text(c, 'FOOT OVER BRIDGE', x - 4, y - 9, '#ffffff');
  for (const p of PLATFORM_IDS) text(c, `PF ${p} v`, x + 12, (PF[p].y0 + 2) * 16 - 10, '#ffd23f', 1, '#161616');
  text(c, 'HALL v', x + 14, 30 * 16 - 8, '#ffd23f', 1, '#161616');
  // arrows painted on the deck
  for (let yy = y + 20; yy < y + h; yy += 64) { R(c, x + 30, yy, 4, 10, 'rgba(255,255,255,0.35)'); }
  return cv;
}
