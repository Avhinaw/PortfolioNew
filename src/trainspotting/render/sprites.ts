import { COACH_NAMES, PF } from '@/game/map';
import { R, shade, text, textW, type Ctx } from './pixel';

export type Face = 'd' | 'u' | 'l' | 'r';
export interface Look {
  skin: string; hair: string; shirt: string; pants: string; shoes?: string;
  acc?: 'cap' | 'badge' | 'folder' | 'pack' | 'scarf' | 'apron' | 'none';
  hat?: string; pack?: string; scarf?: string; wide?: boolean; long?: boolean;
}
export interface Pose { moving: boolean; run: boolean; busy: boolean; stuck: boolean; t: number }

export const LOOKS: Record<string, Look> = {
  player: { skin: '#e0ac80', hair: '#1c1410', shirt: '#ffd23f', pants: '#2f5fa8', shoes: '#f4f4f4', acc: 'pack', pack: '#d94a38' },
  scout:  { skin: '#c68a5e', hair: '#201814', shirt: '#2fa3a3', pants: '#b79b66', shoes: '#3b2a1f', acc: 'cap', hat: '#2c5fc9' },
  loader: { skin: '#a86f44', hair: '#2a1c14', shirt: '#b5302a', pants: '#6b5a46', shoes: '#222222', acc: 'badge' },
  fixer:  { skin: '#e3b48c', hair: '#4a3020', shirt: '#6fbf5a', pants: '#3b3f55', shoes: '#222222', acc: 'folder' },
  anchor: { skin: '#8d5a3a', hair: '#111111', shirt: '#7a4fc9', pants: '#2e2e3a', shoes: '#222222', acc: 'scarf', scarf: '#f2c230', wide: true },
  vendor: { skin: '#b9784c', hair: '#2a1c14', shirt: '#e7e0c8', pants: '#5a4a3a', shoes: '#222222', acc: 'apron' },
  clerk:  { skin: '#d9a77a', hair: '#3a2a20', shirt: '#4b7fb8', pants: '#2e2e3a', shoes: '#222222', acc: 'none' },
};
const SKINS = ['#f0c8a0', '#e0ac80', '#c68a5e', '#a86f44', '#8d5a3a', '#6b4128'];
const HAIRS = ['#111111', '#1c1410', '#3a2a20', '#5a3a22', '#777777', '#caa66a'];
const SHIRTS = ['#e8e2d0', '#d85c4a', '#4a8fd8', '#e8b03a', '#5fae6a', '#b45fb4', '#d8d8d8', '#e87a2a', '#3a3f6a', '#8ac0c0'];
const PANTS = ['#2f3a55', '#4a3a2a', '#6a6a72', '#2a2a2a', '#7a6a4a', '#3a4a3a'];
export function npcLook(seed: number): Look {
  const p = <T,>(a: T[], k: number) => a[Math.floor(((Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1 * a.length)];
  const roll = ((Math.sin(seed * 3.1) * 999) % 1 + 1) % 1;
  return {
    skin: p(SKINS, 1), hair: p(HAIRS, 2), shirt: p(SHIRTS, 3), pants: p(PANTS, 4), shoes: '#222222',
    acc: roll < 0.25 ? 'pack' : roll < 0.4 ? 'cap' : 'none', pack: p(SHIRTS, 5), hat: p(SHIRTS, 6), long: roll > 0.8,
  };
}

/** x = horizontal centre, y = ground line (feet bottom). */
export function drawPerson(c: Ctx, x: number, y: number, L: Look, face: Face, frame: number, o: Pose) {
  x = Math.round(x); y = Math.round(y);
  if (o.stuck) x += Math.floor(o.t * 20) % 2 === 0 ? -1 : 1;
  R(c, x - 5, y - 1, 11, 3, 'rgba(0,0,0,0.25)');
  if (face === 'l' || face === 'r') {
    c.save();
    if (face === 'l') { c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); }
    side(c, x, y, L, frame, o);
    c.restore();
  } else front(c, x, y, L, face === 'u', frame, o);
}

function front(c: Ctx, x: number, y: number, L: Look, back: boolean, fr: number, o: Pose) {
  const mv = o.moving, sw = mv ? [0, 1, 0, -1][fr & 3] : 0;
  const b = mv ? (fr & 1) : Math.floor(o.t * 1.5) % 3 === 0 ? 1 : 0;
  const pants = L.pants, pantsD = shade(pants, 0.78), shoe = L.shoes ?? '#222222';
  const half = L.wide ? 4 : 3, shirt = L.shirt;

  const legs: [number, number][] = [[x - 3, sw > 0 ? 1 : 0], [x + 1, sw < 0 ? 1 : 0]];
  legs.forEach(([lx, lift], i) => {
    R(c, lx, y - 5, 3, 4 + (lift ? 0 : 1), i ? pantsD : pants);
    R(c, lx, y - 1 - lift, 3, 1, shoe);
  });

  const ty = y - 11 - b;
  const swing = o.run ? 2 : 1;
  const aL = sw * swing, aR = -sw * swing;
  R(c, x - half - 2, ty + 1 + aL, 2, 4, shirt); R(c, x - half - 2, ty + 5 + aL, 2, 1, L.skin);
  const rise = o.busy ? -3 + (Math.floor(o.t * 6) % 2) : aR;
  R(c, x + half + 1, ty + 1 + rise, 2, 4, shade(shirt, 0.88)); R(c, x + half + 1, ty + (o.busy ? 0 : 5) + rise, 2, 1, L.skin);
  R(c, x - half, ty, half * 2 + 1, 6, shirt);
  R(c, x - half, ty + 5, half * 2 + 1, 1, shade(shirt, 0.75));

  const hy = y - 18 - b;
  R(c, x - 3, hy, 7, 7, L.skin);
  if (back) {
    R(c, x - 3, hy, 7, 6, L.hair);
  } else {
    R(c, x - 3, hy, 7, 2, L.hair); R(c, x - 3, hy + 2, 1, L.long ? 5 : 2, L.hair); R(c, x + 3, hy + 2, 1, L.long ? 5 : 2, L.hair);
    if (o.stuck) { R(c, x - 3, hy + 4, 2, 1, '#161616'); R(c, x + 1, hy + 4, 2, 1, '#161616'); R(c, x + 4, hy + 2, 1, 2, '#7ec8ff'); }
    else { R(c, x - 2, hy + 4, 1, 1, '#161616'); R(c, x + 2, hy + 4, 1, 1, '#161616'); }
    R(c, x, hy + 6, 1, 1, shade(L.skin, 0.8));
  }
  accessories(c, x, hy, ty, L, back ? 'b' : 'f', half);
}

function side(c: Ctx, x: number, y: number, L: Look, fr: number, o: Pose) {
  const mv = o.moving, dx = mv ? [0, 2, 0, -2][fr & 3] : 0;
  const b = mv ? (fr & 1) : Math.floor(o.t * 1.5) % 3 === 0 ? 1 : 0;
  const pants = L.pants, shoe = L.shoes ?? '#222222';
  R(c, x - 1 - dx, y - 5, 2, 4, shade(pants, 0.78)); R(c, x - 1 - dx, y - 1, 3, 1, shoe);
  R(c, x - 1 + dx, y - 5, 2, 5, pants); R(c, x - 1 + dx, y - 1, 3, 1, shoe);
  const ty = y - 11 - b, lean = o.run ? 1 : 0;
  R(c, x - 2, ty, 5, 6, L.shirt); R(c, x - 2, ty + 5, 5, 1, shade(L.shirt, 0.75));
  const ax = x - 1 - dx * (o.run ? 1.5 : 1);
  R(c, ax, ty + 1, 2, 4, shade(L.shirt, 0.85)); R(c, ax, ty + 5, 2, 1, L.skin);
  const hy = y - 18 - b, hx = x + lean;
  R(c, hx - 3, hy, 7, 7, L.skin);
  R(c, hx - 3, hy, 7, 2, L.hair); R(c, hx - 3, hy + 2, 3, L.long ? 5 : 3, L.hair);
  if (o.stuck) R(c, hx + 1, hy + 4, 2, 1, '#161616'); else R(c, hx + 2, hy + 4, 1, 1, '#161616');
  R(c, hx + 4, hy + 4, 1, 1, L.skin);
  accessories(c, hx, hy, ty, L, 's', 2);
}

function accessories(c: Ctx, x: number, hy: number, ty: number, L: Look, v: 'f' | 'b' | 's', half: number) {
  switch (L.acc) {
    case 'cap': {
      R(c, x - 3, hy - 1, 7, 3, L.hat ?? '#2c5fc9');
      if (v === 'f') R(c, x - 3, hy + 2, 7, 1, shade(L.hat ?? '#2c5fc9', 0.7));
      if (v === 's') R(c, x + 3, hy + 2, 3, 1, shade(L.hat ?? '#2c5fc9', 0.7));
      break;
    }
    case 'scarf': R(c, x - 3, hy + 6, v === 's' ? 6 : 7, 2, L.scarf ?? '#f2c230'); break;
    case 'badge': if (v === 'f') R(c, x - half - 2, ty + 1, 2, 2, '#e0b040'); if (v === 's') R(c, x - 1, ty + 1, 2, 2, '#e0b040'); break;
    case 'folder': if (v === 'f') { R(c, x + half + 2, ty + 3, 3, 4, '#f4f4f0'); R(c, x + half + 3, ty + 4, 1, 1, '#999999'); } if (v === 's') R(c, x + 3, ty + 3, 3, 4, '#f4f4f0'); break;
    case 'pack': {
      const pc = L.pack ?? '#d94a38';
      if (v === 'b') R(c, x - 3, ty, 7, 5, pc);
      else if (v === 'f') { R(c, x - 2, ty, 1, 5, shade(pc, 0.7)); R(c, x + 2, ty, 1, 5, shade(pc, 0.7)); }
      else R(c, x - 5, ty, 3, 5, pc);
      break;
    }
    case 'apron': if (v === 'f') R(c, x - 2, ty + 1, 5, 5, '#f1ede0'); if (v === 's') R(c, x, ty + 1, 3, 5, '#f1ede0'); break;
  }
}

// ---------- props ----------
const BAG_COLS = ['#b5302a', '#2c5fc9', '#3a8a5a', '#b8822a'];
export function drawBag(c: Ctx, x: number, y: number, kind = 0) {
  const col = BAG_COLS[kind % BAG_COLS.length];
  x = Math.round(x); y = Math.round(y);
  R(c, x - 5, y - 1, 10, 2, 'rgba(0,0,0,0.22)');
  R(c, x - 4, y - 7, 8, 7, col); R(c, x - 4, y - 7, 8, 1, shade(col, 1.3)); R(c, x - 4, y - 3, 8, 1, shade(col, 0.7));
  R(c, x - 2, y - 9, 4, 1, '#222222'); R(c, x - 2, y - 9, 1, 2, '#222222'); R(c, x + 1, y - 9, 1, 2, '#222222');
  R(c, x - 1, y - 4, 2, 1, '#e0b040');
}

export function drawCow(c: Ctx, x: number, y: number, t: number) {
  const hb = Math.floor(t * 1.5) % 2;
  R(c, x - 11, y - 1, 22, 3, 'rgba(0,0,0,0.25)');
  for (const lx of [-8, -5, 3, 6]) R(c, x + lx, y - 4, 2, 4, '#e9e3d4');
  R(c, x - 9, y - 12, 18, 9, '#f1ece0'); R(c, x - 9, y - 4, 18, 1, '#d8d0bc');
  R(c, x - 5, y - 11, 5, 4, '#6b4a35'); R(c, x + 3, y - 9, 5, 3, '#6b4a35');
  R(c, x - 15, y - 13 + hb, 7, 7, '#f1ece0'); R(c, x - 16, y - 9 + hb, 3, 3, '#e8a0a0');
  R(c, x - 14, y - 15 + hb, 1, 2, '#d8d0b0'); R(c, x - 10, y - 15 + hb, 1, 2, '#d8d0b0'); R(c, x - 13, y - 11 + hb, 1, 1, '#111111');
  R(c, x + 9, y - 11, 1, 7 + (Math.floor(t * 3) % 2), '#6b4a35');
}

export function drawSleeper(c: Ctx, x: number, y: number, t: number) {
  R(c, x - 14, y - 1, 28, 3, 'rgba(0,0,0,0.22)');
  R(c, x - 14, y - 5, 7, 4, '#3b3f55'); R(c, x - 8, y - 6, 14, 5, '#d85c4a'); R(c, x - 8, y - 6, 14, 1, '#e88a7a');
  R(c, x + 6, y - 7, 6, 6, '#c68a5e'); R(c, x + 6, y - 7, 6, 2, '#1c1410');
  const z = Math.floor(t * 1.5) % 3;
  text(c, 'Z', x + 8, y - 13 - z, '#ffffff', 1, '#161616');
  if (z > 0) text(c, 'Z', x + 12, y - 17 - z, '#ffffff', 1, '#161616');
}

export function drawTrolley(c: Ctx, x: number, y: number) {
  R(c, x - 11, y - 1, 22, 3, 'rgba(0,0,0,0.22)');
  R(c, x - 8, y - 6, 16, 3, '#555a62'); R(c, x - 8, y - 12, 1, 7, '#555a62');
  R(c, x - 6, y - 14, 8, 8, '#b5302a'); R(c, x + 2, y - 13, 6, 7, '#2c5fc9'); R(c, x - 5, y - 17, 5, 3, '#b8822a');
  R(c, x - 7, y - 3, 3, 3, '#111111'); R(c, x + 4, y - 3, 3, 3, '#111111');
}

export function drawBarricade(c: Ctx, x: number, y: number, label?: string) {
  R(c, x - 12, y - 1, 24, 3, 'rgba(0,0,0,0.22)');
  R(c, x - 11, y - 10, 2, 10, '#444a52'); R(c, x + 9, y - 10, 2, 10, '#444a52');
  for (let i = 0; i < 22; i += 4) { R(c, x - 11 + i, y - 9, 2, 3, '#e8c13a'); R(c, x - 9 + i, y - 9, 2, 3, '#d63a30'); }
  if (label) text(c, label, x - Math.floor((label.length * 4 - 1) / 2), y - 17, '#ffffff', 1, '#161616');
}

export function drawCone(c: Ctx, x: number, y: number) {
  R(c, x - 3, y - 1, 7, 2, 'rgba(0,0,0,0.25)');
  R(c, x - 2, y - 7, 4, 6, '#ff7a1a'); R(c, x - 2, y - 5, 4, 1, '#ffffff'); R(c, x - 3, y - 1, 6, 1, '#d85a0a');
}

export function drawPuddle(c: Ctx, x: number, y: number) {
  R(c, x - 8, y - 4, 16, 5, '#6a4a2a'); R(c, x - 6, y - 5, 12, 7, '#7a5a38'); R(c, x - 3, y - 4, 4, 1, '#a88858');
  text(c, '!', x - 1, y - 13, '#e8c13a', 1, '#161616');
}

export function drawTaxi(c: Ctx, x: number, y: number, dir: 1 | -1) {
  x = Math.round(x);
  R(c, x - 15, y - 1, 30, 3, 'rgba(0,0,0,0.3)');
  R(c, x - 14, y - 7, 28, 6, '#f2c230'); R(c, x - 14, y - 7, 28, 1, '#ffe27a');
  R(c, x - 8, y - 12, 15, 5, '#1d1d22'); R(c, x - 6, y - 11, 5, 3, '#9ad0e8'); R(c, x, y - 11, 5, 3, '#9ad0e8');
  R(c, x + (dir > 0 ? 11 : -14), y - 6, 3, 2, '#fff7c0');
  R(c, x - 11, y - 3, 5, 4, '#111111'); R(c, x + 6, y - 3, 5, 4, '#111111');
  R(c, x - 2, y - 14, 4, 2, '#fff7c0');
}

export function drawTree(c: Ctx, x: number, y: number, seed = 0) {
  R(c, x - 8, y - 1, 16, 3, 'rgba(0,0,0,0.25)');
  R(c, x - 1, y - 8, 3, 8, '#5b3a24');
  const g = ['#2f6b3a', '#3b7f44', '#4a9552'][seed % 3];
  R(c, x - 6, y - 22, 13, 5, g); R(c, x - 8, y - 18, 17, 7, g); R(c, x - 6, y - 12, 13, 4, shade(g, 0.8));
  R(c, x - 3, y - 21, 4, 2, shade(g, 1.3)); R(c, x + 2, y - 16, 3, 2, shade(g, 1.3));
}

export function drawLamp(c: Ctx, x: number, y: number) {
  R(c, x - 3, y - 1, 7, 2, 'rgba(0,0,0,0.25)');
  R(c, x - 1, y - 30, 2, 30, '#2c2c34'); R(c, x - 2, y - 3, 4, 3, '#3c3c46');
  R(c, x - 3, y - 34, 6, 4, '#ffe9a0'); R(c, x - 3, y - 35, 6, 1, '#2c2c34');
}

export function drawBench(c: Ctx, x: number, y: number) {
  R(c, x - 12, y - 1, 24, 3, 'rgba(0,0,0,0.22)');
  R(c, x - 11, y - 5, 2, 5, '#333840'); R(c, x + 9, y - 5, 2, 5, '#333840');
  R(c, x - 11, y - 8, 22, 3, '#8a5a32'); R(c, x - 11, y - 13, 22, 3, '#7a4a2a'); R(c, x - 11, y - 8, 22, 1, '#a8743f');
}

export function drawPillar(c: Ctx, x: number, y: number) {
  R(c, x - 4, y - 1, 9, 2, 'rgba(0,0,0,0.25)');
  R(c, x - 2, y - 36, 5, 36, '#858b93'); R(c, x - 2, y - 36, 1, 36, '#a9aeb5'); R(c, x + 2, y - 36, 1, 36, '#666c74');
  R(c, x - 3, y - 4, 7, 4, '#5f656b'); R(c, x - 2, y - 14, 5, 2, '#e8c13a'); R(c, x - 3, y - 38, 7, 3, '#5f656b');
}

export function drawChaiStall(c: Ctx, x: number, y: number, t: number) {
  R(c, x - 20, y - 1, 40, 3, 'rgba(0,0,0,0.25)');
  R(c, x - 18, y - 16, 36, 15, '#8a5a36'); R(c, x - 18, y - 16, 36, 2, '#a8743f'); R(c, x - 18, y - 4, 36, 3, '#6a4426');
  R(c, x - 16, y - 21, 7, 5, '#c8ccd2'); R(c, x - 17, y - 19, 2, 2, '#c8ccd2'); // kettle
  for (let i = 0; i < 4; i++) R(c, x - 4 + i * 5, y - 20, 3, 4, '#e8f0f4'); // glasses
  R(c, x + 12, y - 20, 5, 4, '#d85c4a');
  R(c, x - 20, y - 40, 3, 24, '#4a4a52'); R(c, x + 17, y - 40, 3, 24, '#4a4a52');
  for (let i = 0; i < 10; i++) R(c, x - 21 + i * 4.4, y - 40, 4.4, 9, i % 2 ? '#f4efe4' : '#d6453d');
  R(c, x - 21, y - 31, 42, 1, 'rgba(0,0,0,0.25)');
  text(c, 'CHAI', x - 7, y - 37, '#ffffff', 1, '#7a1f18');
  const st = Math.floor(t * 2) % 2; R(c, x - 15, y - 25 - st, 1, 3, 'rgba(255,255,255,0.5)'); // steam
}

export function drawTicketBooth(c: Ctx, x: number, y: number) {
  R(c, x - 26, y - 1, 52, 3, 'rgba(0,0,0,0.25)');
  R(c, x - 24, y - 30, 48, 29, '#5b6a78'); R(c, x - 24, y - 30, 48, 2, '#7c8c9a');
  R(c, x - 20, y - 26, 40, 14, 'rgba(143,198,216,0.5)'); R(c, x - 20, y - 26, 40, 2, 'rgba(196,230,240,0.7)');
  R(c, x - 24, y - 12, 48, 11, '#6b4a2e'); R(c, x - 24, y - 12, 48, 2, '#8a6038'); R(c, x - 3, y - 18, 6, 6, '#3a2a20'); // slot
  R(c, x - 24, y - 36, 48, 6, '#1d2a38'); text(c, 'TICKETS', x - 13, y - 34, '#ffd23f');
  for (const px of [-30, 30]) { R(c, x + px - 1, y - 9, 2, 9, '#c8a030'); R(c, x + px - 2, y - 10, 4, 2, '#c8a030'); }
}

export function drawBoard(c: Ctx, x: number, y: number, shows: number, dead: boolean, t: number) {
  R(c, x - 22, y - 8, 2, 14, '#333840'); R(c, x + 20, y - 8, 2, 14, '#333840');
  R(c, x - 24, y - 26, 48, 22, '#1b1b22'); R(c, x - 24, y - 26, 48, 1, '#3a3a46');
  R(c, x - 22, y - 24, 44, 18, '#07121c');
  if (dead) {
    text(c, 'ERROR', x - 9, y - 21, Math.floor(t * 3) % 2 ? '#ff4a3a' : '#7f1d1d');
    text(c, '- - -', x - 9, y - 13, '#7f1d1d');
  } else {
    text(c, 'PF', x - 18, y - 19, '#ffb000', 2);
    text(c, String(shows), x - 2, y - 19, '#ffb000', 2, '#7a4a00');
    text(c, 'ON TIME', x - 12, y - 9, '#5fe08a');
  }
}

export function drawClock(c: Ctx, x: number, y: number) {
  R(c, x - 5, y - 5, 10, 10, '#161616'); R(c, x - 4, y - 4, 8, 8, '#f4efe4');
  R(c, x, y - 3, 1, 4, '#161616'); R(c, x, y, 3, 1, '#161616');
}

// ---------- train ----------
function coach(c: Ctx, x0: number, doors: (boolean | null)[], label: string, mine: boolean, t: number) {
  const color = '#2c5fc9', dark = shade(color, 0.7);
  R(c, x0, 6, 96, 5, '#9aa5ad'); R(c, x0, 6, 96, 1, '#d0d8de');
  for (const v of [12, 44, 76]) R(c, x0 + v, 7, 6, 2, '#6a747c');
  R(c, x0, 11, 96, 29, color); R(c, x0, 11, 96, 1, shade(color, 1.25));
  for (const [wx, ww] of [[3, 12], [35, 10], [49, 10], [83, 10]]) {
    R(c, x0 + wx, 15, ww, 10, '#161a24'); R(c, x0 + wx + 1, 16, ww - 2, 8, '#bfe6f5'); R(c, x0 + wx + 1, 16, ww - 2, 2, '#e8f8ff');
    for (let b = 3; b < ww - 1; b += 3) R(c, x0 + wx + b, 16, 1, 8, '#4a5a68');
  }
  R(c, x0, 30, 96, 3, '#f2c230'); R(c, x0, 33, 96, 7, dark); R(c, x0, 40, 96, 5, '#26262c');
  for (const bx of [6, 66]) { R(c, x0 + bx, 41, 22, 5, '#111114'); for (let w = 0; w < 22; w += 7) R(c, x0 + bx + w + 1, 42, 4, 3, '#4a4a52'); }
  R(c, x0 + 35, 34, 26, 7, '#f4efe4'); text(c, label, x0 + 48 - Math.floor(textW(label) / 2), 35, '#161616');
  doors.forEach((st, i) => {
    const xd = x0 + 24 + i * 48;
    R(c, xd - 6, 13, 12, 27, '#1d3f6e');
    if (st === true) { R(c, xd - 5, 14, 10, 26, '#14100f'); R(c, xd - 4, 18, 8, 22, '#e8d9a0'); R(c, xd - 2, 24, 4, 16, '#caa860'); }
    else { R(c, xd - 5, 14, 10, 26, shade(color, 1.1)); R(c, xd - 3, 16, 6, 7, '#9ad0e8'); R(c, xd + 3, 27, 1, 3, '#f2c230'); R(c, xd, 14, 1, 26, dark); }
    if (st !== null) R(c, xd - 1, 9, 3, 2, st ? '#3cdc5a' : '#e03c3c');
  });
  if (mine) {
    const on = Math.floor(t * 3) % 2 === 0;
    R(c, x0 - 1, 5, 98, 1, on ? '#ffd23f' : '#fff7c0'); R(c, x0 - 1, 45, 98, 1, on ? '#ffd23f' : '#fff7c0');
    R(c, x0 - 1, 5, 1, 41, '#ffd23f'); R(c, x0 + 96, 5, 1, 41, '#ffd23f');
    const bob = Math.round(Math.sin(t * 5) * 1.5);
    R(c, x0 + 44, -4 + bob, 9, 1, '#161616'); R(c, x0 + 45, -3 + bob, 7, 1, '#161616'); R(c, x0 + 46, -2 + bob, 5, 1, '#161616'); R(c, x0 + 48, -1 + bob, 1, 1, '#161616');
    R(c, x0 + 45, -4 + bob, 7, 1, '#ffd23f'); R(c, x0 + 47, -3 + bob, 3, 1, '#ffd23f');
    text(c, 'YOUR COACH', x0 + 48 - Math.floor(textW('YOUR COACH') / 2), -12 + bob, '#ffd23f', 1, '#161616');
  }
}

function loco(c: Ctx, x0: number) {
  R(c, x0, 8, 96, 4, '#c8ccd2'); R(c, x0, 12, 96, 28, '#d9dde2'); R(c, x0, 12, 96, 1, '#ffffff');
  R(c, x0, 22, 96, 8, '#2c5fc9'); R(c, x0, 30, 96, 3, '#f2c230'); R(c, x0, 33, 96, 7, '#8a8f96');
  R(c, x0 + 8, 15, 16, 8, '#161a24'); R(c, x0 + 9, 16, 14, 6, '#9ad0e8');
  for (let g = 0; g < 4; g++) R(c, x0 + 40 + g * 10, 14, 7, 7, '#a8aeb6');
  R(c, x0 + 82, 14, 12, 26, '#e8802a'); R(c, x0 + 86, 17, 4, 4, '#fff7c0');
  text(c, 'WAP7', x0 + 30, 25, '#ffffff', 1);
  R(c, x0, 40, 96, 5, '#26262c'); for (const bx of [6, 66]) R(c, x0 + bx, 41, 22, 5, '#111114');
}

/** Whole rake on its berth: PC S4 S3 S2 S1 + loco. xw = world-x of the west end. */
export function drawTrain(c: Ctx, xw: number, plat: number, doors: boolean[], assigned: number, t: number) {
  const x = Math.round(xw / 2);
  c.save(); c.translate(0, PF[plat].y0 * 16 - 3 - 46);
  for (let i = 0; i < 5; i++) coach(c, x + i * 98, [doors[i * 2], doors[i * 2 + 1]], COACH_NAMES[i], i === assigned, t);
  loco(c, x + 5 * 98);
  for (let i = 0; i < 5; i++) R(c, x + i * 98 + 96, 30, 2, 2, '#222');
  c.restore();
}

// ---------- station furniture ----------
export function drawAuto(c: Ctx, x: number, y: number, dir: 1 | -1) {
  x = Math.round(x);
  R(c, x - 11, y - 1, 22, 3, 'rgba(0,0,0,0.3)');
  R(c, x - 10, y - 8, 20, 6, '#1d1d22'); R(c, x - 10, y - 8, 20, 1, '#3a3a44');
  R(c, x - 8, y - 15, 16, 7, '#f2c230'); R(c, x - 6, y - 13, 12, 4, '#8a6a10');
  R(c, x + (dir > 0 ? 6 : -9), y - 11, 3, 3, '#9ad0e8');
  R(c, x - 8, y - 4, 4, 4, '#111111'); R(c, x + 4, y - 4, 4, 4, '#111111');
}

export function drawStairsFlight(c: Ctx, x: number, y: number, w: number, h: number, label: string) {
  R(c, x, y, w, h, '#b9ad94');
  for (let s = 0; s < w; s += 3) { R(c, x + s, y, 1, h, '#d8cdb4'); R(c, x + s + 1, y, 1, h, '#8e8368'); }
  R(c, x, y, w, 2, '#e8b030'); R(c, x, y + h - 2, w, 2, '#e8b030');
  text(c, label, x - 1, y + h + 2, '#ffffff', 1, '#161616');
}

export function drawLiftTower(c: Ctx, x: number, y: number, h: number, state: 'ok' | 'broken' | 'jam', t: number) {
  R(c, x + 2, y + 2, 32, h, 'rgba(0,0,0,0.25)');
  R(c, x, y, 32, h, '#4a5868'); R(c, x + 2, y + 2, 28, h - 4, '#7fa8bf'); R(c, x + 2, y + 2, 28, 3, '#b8d8e8');
  for (let i = 0; i < h - 6; i += 6) R(c, x + 2, y + 5 + i, 28, 1, '#5d8399');
  R(c, x + 22, y + h - 24, 8, 22, '#c8ced4'); R(c, x + 26, y + h - 24, 1, 22, '#8a929a');
  R(c, x, y - 7, 32, 7, '#1d2a38'); text(c, 'LIFT', x + 9, y - 6, '#ffd23f');
  const lit = state === 'broken' ? '#ff4a3a' : state === 'jam' ? (Math.floor(t * 3) % 2 ? '#ffa030' : '#503010') : '#3cdc5a';
  R(c, x + 26, y + 6, 4, 4, lit);
  if (state === 'broken') { for (let i = 0; i < 28; i++) { R(c, x + 2 + i, y + 4 + (i * (h - 8)) / 28, 2, 2, '#ff4a3a'); R(c, x + 29 - i, y + 4 + (i * (h - 8)) / 28, 2, 2, '#ff4a3a'); } text(c, 'OUT OF ORDER', x - 14, y + h + 3, '#ff4a3a', 1, '#161616'); }
}

export function drawSignBoard(c: Ctx, x: number, y: number, line1: string, line2: string) {
  const w = Math.max(textW(line1), textW(line2)) + 8;
  R(c, x - 1, y - 2, 2, 12, '#333840'); R(c, x + w - 3, y - 2, 2, 12, '#333840');
  R(c, x - 2, y + 1, w + 2, 15, '#161616'); R(c, x - 1, y + 2, w, 13, '#1f5fa8');
  text(c, line1, x + 3, y + 4, '#ffffff'); text(c, line2, x + 3, y + 10, '#ffd23f');
}

export function drawCart(c: Ctx, x: number, y: number, kind: number, t: number) {
  R(c, x - 14, y - 1, 28, 3, 'rgba(0,0,0,0.25)');
  R(c, x - 12, y - 10, 24, 8, kind ? '#d6453d' : '#2f8a5a'); R(c, x - 12, y - 10, 24, 1, '#ffffff');
  R(c, x - 12, y - 18, 24, 3, kind ? '#f4efe4' : '#e8c13a'); R(c, x - 11, y - 18, 2, 10, '#555a62'); R(c, x + 10, y - 18, 2, 10, '#555a62');
  for (let i = 0; i < 5; i++) R(c, x - 9 + i * 4, y - 13, 3, 3, i % 2 ? '#e8c13a' : '#f4efe4');
  R(c, x - 10, y - 3, 4, 3, '#111111'); R(c, x + 6, y - 3, 4, 3, '#111111');
  text(c, kind ? 'CHAI' : 'SNACKS', x - (kind ? 7 : 11), y - 26, '#ffffff', 1, '#161616');
  if (Math.floor(t * 2) % 2) R(c, x - 3, y - 22, 1, 3, 'rgba(255,255,255,0.6)');
}

export function drawBoardBig(c: Ctx, x: number, y: number, shows: number, coach: string, dead: boolean, t: number) {
  R(c, x - 30, y - 6, 3, 12, '#333840'); R(c, x + 27, y - 6, 3, 12, '#333840');
  R(c, x - 32, y - 30, 64, 26, '#1b1b22'); R(c, x - 32, y - 30, 64, 1, '#3a3a46');
  R(c, x - 30, y - 28, 60, 22, '#07121c');
  if (dead) { text(c, 'ERROR', x - 9, y - 24, Math.floor(t * 3) % 2 ? '#ff4a3a' : '#7f1d1d'); text(c, '- - -', x - 9, y - 15, '#7f1d1d'); }
  else {
    text(c, '12951 LAST CALL EXP', x - 28, y - 26, '#5fe08a');
    text(c, 'PF', x - 28, y - 18, '#ffb000', 2);
    text(c, String(shows), x - 12, y - 18, '#ffb000', 2, '#7a4a00');
    text(c, 'COACH', x + 2, y - 19, '#9ad0e8'); text(c, coach, x + 7, y - 12, '#ffffff');
  }
  R(c, x - 32, y - 38, 64, 8, '#c8321e'); text(c, 'TRAIN INDICATOR', x - 28, y - 36, '#ffffff');
}
