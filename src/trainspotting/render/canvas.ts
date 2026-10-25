import type { Engine } from '@/game/engine';
import { COACH_NAMES, COLS, LINKS, PF, PLATFORM_IDS, POI, ROWS, doorWorld, findPathGround, isWalk } from '@/game/map';
import { DEF_BY_ID } from '@/game/obstacles/director';
import type { Friend, Lv, Role, Vec2 } from '@/game/types';
import { R, bubble, hash, text, textW, type Ctx } from './pixel';
import {
  LOOKS, drawAuto, drawBag, drawBarricade, drawBench, drawBoardBig, drawCart, drawCone, drawCow, drawLamp, drawLiftTower, drawPerson,
  drawPillar, drawPuddle, drawSignBoard, drawSleeper, drawTaxi, drawTrain, drawTrolley, npcLook, type Face, type Look, type Pose,
} from './sprites';
import { SH, SW, buildDeck, buildGround, makeCanvas } from './world';

export const CW = 960, CH = 640;           // real canvas
export const VW = 320, VH = 214;           // internal pixel-art viewport
const SC = CW / VW;
const ROLE_COLOR: Record<Role, string> = { scout: '#6ab0ff', loader: '#ff7a6a', fixer: '#8ee07a', anchor: '#c8a0ff' };
const CROWD_IDS = new Set(['crowd_surge', 'vendor_swarm', 'construction_block']);

interface Anim { x: number; y: number; face: Face; dist: number; speed: number; dust: number }
interface Npc { x: number; y: number; path: Vec2[]; wait: number; look: Look; face: Face; dist: number; moving: boolean; speed: number }
interface Car { x: number; y: number; dir: 1 | -1; speed: number; auto: boolean }
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string }
interface Item { y: number; lv: Lv; draw: () => void }
interface Prop { x: number; y: number; draw: (b: Ctx, t: number) => void }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Renderer {
  private ground = buildGround();
  private deck = buildDeck();
  private buf = makeCanvas(VW, VH);
  private b = this.buf.getContext('2d')!;
  private mini = makeCanvas(COLS * 3, ROWS * 3);
  private cam = { x: 0, y: 0, init: false };
  private anims = new Map<string, Anim>();
  private npcs: Npc[] = [];
  private cars: Car[] = [];
  private parts: Part[] = [];
  private props: Prop[] = [];
  private time = 0; private shake = 0; private lastObs = 0;
  private endAt: number | null = null;
  private boardedSeen = new Set<string>();
  private heroBuf: HTMLCanvasElement | null = null;

  constructor(private ctx: Ctx) {
    for (let i = 0; i < 38; i++) {
      let tx = 0, ty = 0;
      do { tx = Math.floor(Math.random() * COLS); ty = Math.floor(Math.random() * ROWS); } while (!isWalk(tx, ty));
      this.npcs.push({ x: tx * 32 + 16, y: ty * 32 + 16, path: [], wait: Math.random() * 4, look: npcLook(i * 7 + 3), face: 'd', dist: 0, moving: false, speed: 24 + Math.random() * 20 });
    }
    for (let i = 0; i < 7; i++) this.cars.push({ x: i * 150, y: i % 2 ? 748 : 764, dir: i % 2 ? -1 : 1, speed: 24 + (i % 3) * 10, auto: i % 3 === 0 });
    this.buildProps();
    const m = this.mini.getContext('2d')!;
    R(m, 0, 0, COLS * 3, ROWS * 3, '#1b2a1e');
    for (const p of PLATFORM_IDS) { R(m, 0, PF[p].ty0 * 3, COLS * 3, 12, '#3a3532'); R(m, 18, PF[p].y0 * 3, 52 * 3, 15, '#d9854a'); }
    R(m, 12, 31 * 3, 56 * 3, 30, '#e0d3b0'); R(m, 12, 42 * 3, 56 * 3, 12, '#9a927e'); R(m, 30 * 3, 4 * 3, 12, 28 * 3, '#eef2f6');
    text(m, 'P1', 4, 25 * 3 + 4, '#ffffff'); text(m, 'P2', 4, 16 * 3 + 4, '#ffffff'); text(m, 'P3', 4, 7 * 3 + 4, '#ffffff'); text(m, 'HALL', 90, 33 * 3, '#554a38');
  }

  private buildProps() {
    const P = this.props;
    for (const p of PLATFORM_IDS) {
      const base = (PF[p].y0 + 3) * 16 + 6;
      for (let i = 0, x = 128; x < 900; x += 96, i++) {
        if (x > 430 && x < 610) continue;
        P.push({ x, y: base, draw: (b) => { drawPillar(b, x, base); if (i % 2 === 0) drawSignBoard(b, x - 16, base - 44, `PLATFORM ${p}`, 'MUMBAI >>'); } });
        P.push({ x: x + 46, y: base + 4, draw: (b) => drawLamp(b, x + 46, base + 4) });
      }
      for (const x of [150, 330, 700, 860]) P.push({ x, y: PF[p].y1 * 16 + 12, draw: (b) => drawBench(b, x, PF[p].y1 * 16 + 12) });
      const cx = p === 1 ? 270 : p === 2 ? 790 : 300, cy = (PF[p].y0 + 3) * 16 + 14;
      P.push({ x: cx, y: cy, draw: (b, t) => drawCart(b, cx, cy, p % 2, t) });
    }
    for (const x of [300, 340, 380, 640, 680]) P.push({ x, y: 620, draw: (b) => drawBench(b, x, 620) });
    for (const l of LINKS) if (l.kind === 'lift') {
      const x = 544, y = Math.round(l.a.y / 2) - 24, li = LINKS.indexOf(l);
      P.push({ x, y: y + 48, draw: (b, t) => { const st = this.liftState(li); drawLiftTower(b, x, y, 48, st, t); } });
    }
  }
  private liftEngine: Engine | null = null;
  private liftState(li: number): 'ok' | 'broken' | 'jam' {
    const e = this.liftEngine; if (!e) return 'ok';
    const ls = e.s.links[li]; return ls.brokenUntil > e.s.t ? 'broken' : ls.jamUntil > e.s.t ? 'jam' : 'ok';
  }

  // ---------- ambient life ----------
  private stepNpc(n: Npc, dt: number) {
    if (n.wait > 0) { n.wait -= dt; n.moving = false; if (n.wait <= 0) this.retarget(n); return; }
    const wp = n.path[0];
    if (!wp) { n.wait = 2 + Math.random() * 8; n.moving = false; return; }
    const dx = wp.x - n.x, dy = wp.y - n.y, d = Math.hypot(dx, dy), step = n.speed * dt;
    if (d <= step) { n.x = wp.x; n.y = wp.y; n.path.shift(); } else { n.x += (dx / d) * step; n.y += (dy / d) * step; }
    n.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
    n.dist += step; n.moving = true;
  }
  private retarget(n: Npc) {
    for (let k = 0; k < 12; k++) {
      const tx = Math.floor(Math.random() * COLS), ty = Math.floor(Math.random() * ROWS);
      if (!isWalk(tx, ty)) continue;
      const p = findPathGround({ x: n.x, y: n.y }, { x: tx * 32 + 16, y: ty * 32 + 16 });
      if (p) { n.path = p; return; }
    }
    n.wait = 1;
  }
  private stepCars(dt: number) { for (const c of this.cars) { c.x += c.dir * c.speed * dt; if (c.x < -40) c.x = SW + 40; if (c.x > SW + 40) c.x = -40; } }
  private anim(id: string, pos: Vec2, dt: number): Anim {
    let a = this.anims.get(id);
    if (!a) { a = { x: pos.x, y: pos.y, face: 'd', dist: 0, speed: 0, dust: 0 }; this.anims.set(id, a); }
    const dx = pos.x - a.x, dy = pos.y - a.y, d = Math.hypot(dx, dy);
    a.speed = dt > 0 ? d / dt : 0;
    if (d > 0.15) { a.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); a.dist += d; }
    a.x = pos.x; a.y = pos.y;
    return a;
  }
  private spark(x: number, y: number, n: number, cols: string[]) {
    for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: (Math.random() - 0.5) * 50, vy: -10 - Math.random() * 40, life: 0, max: 0.6 + Math.random() * 0.5, col: cols[i % cols.length] });
  }
  private dust(a: Anim, fx: number, fy: number, dt: number) {
    a.dust += dt;
    if (a.dust > 0.11) { a.dust = 0; this.parts.push({ x: fx + (Math.random() - 0.5) * 4, y: fy - 1, vx: (Math.random() - 0.5) * 10, vy: -8 - Math.random() * 8, life: 0, max: 0.35, col: '#d8cdb4' }); }
  }

  /** Position/level of someone who may be mid-staircase or inside a lift. */
  private mover(e: Engine, m: { pos: Vec2; lv: Lv; climb: import('@/game/types').Climb | null }) {
    const c = m.climb;
    if (!c) return { pos: m.pos, lv: m.lv, hidden: false, lift: -1 };
    const l = LINKS[c.link], k = clamp((e.s.t - c.start) / (c.until - c.start), 0, 1);
    const from = c.dir === 1 ? l.a : l.b, to = c.dir === 1 ? l.b : l.a, flv: Lv = c.dir === 1 ? 0 : 1;
    if (l.kind === 'lift') return { pos: from, lv: flv, hidden: true, lift: c.link };
    const kk = Math.min(1, Math.max(0, (k - 0.15) / 0.7));
    return { pos: { x: from.x + (to.x - from.x) * kk, y: from.y + (to.y - from.y) * kk }, lv: (k < 0.5 ? flv : (1 - flv)) as Lv, hidden: false, lift: -1 };
  }

  // ---------- main frame ----------
  draw(e: Engine, dt: number) {
    this.liftEngine = e;
    const s = e.s, ctx = this.ctx, b = this.b;
    this.time += dt;
    if (e.obstacleCount !== this.lastObs) { this.lastObs = e.obstacleCount; this.shake = 0.3; }
    this.shake = Math.max(0, this.shake - dt);
    if (e.ended && this.endAt === null) this.endAt = this.time;
    for (const n of this.npcs) this.stepNpc(n, dt);
    this.stepCars(dt);

    const pm = this.mover(e, s.player);
    let tx = pm.pos.x, ty = pm.pos.y;
    if (s.player.boarded || e.ended) { const d = doorWorld(s.train.left, s.train.drawPlat, s.coach * 2); tx = d.x; ty = d.y + 40; }
    const tcx = clamp(tx / 2 - VW / 2, 0, SW - VW), tcy = clamp(ty / 2 - VH / 2, 0, SH - VH);
    if (!this.cam.init) { this.cam.x = tcx; this.cam.y = tcy; this.cam.init = true; }
    const k = 1 - Math.exp(-dt * 6);
    this.cam.x += (tcx - this.cam.x) * k; this.cam.y += (tcy - this.cam.y) * k;
    const jx = this.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0, jy = this.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
    const cx = Math.round(this.cam.x) + jx, cy = Math.round(this.cam.y) + jy;

    b.imageSmoothingEnabled = false; b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, VW, VH);
    b.save(); b.translate(-cx, -cy);
    b.drawImage(this.ground, 0, 0);
    const vis = (x: number, y: number, pad = 60) => x > cx - pad && x < cx + VW + pad && y > cy - pad && y < cy + VH + pad + 40;

    for (const c of this.cars) if (vis(c.x, c.y)) (c.auto ? drawAuto : drawTaxi)(b, c.x, c.y, c.dir);

    const tr = s.train, t = this.time;
    if (tr.state !== 'away') {
      let xw = tr.x;
      if (tr.state === 'left' && this.endAt !== null) xw = tr.toX - Math.pow(Math.max(0, t - this.endAt), 2) * 160;
      drawTrain(b, xw, tr.drawPlat, [...Array(10).keys()].map((i) => e.doorOpen(i)), s.coach, t);
    }

    const items: Item[] = [];
    const add = (lv: Lv, y: number, draw: () => void) => items.push({ y, lv, draw });
    for (const p of this.props) if (vis(p.x, p.y, 80)) add(0, p.y, () => p.draw(b, t));
    add(0, 560, () => drawBoardBig(b, 376, 558, s.board.shows, COACH_NAMES[s.coach], s.t < s.board.deadUntil, t));
    for (const n of this.npcs) if (vis(n.x / 2, n.y / 2)) add(0, n.y / 2 + 6, () => drawPerson(b, n.x / 2, n.y / 2 + 6, n.look, n.face, Math.floor(n.dist / 8) & 3, { moving: n.moving, run: false, busy: false, stuck: false, t }));
    add(0, 500, () => drawPerson(b, 136, 500, LOOKS.clerk, 'd', 0, { moving: false, run: false, busy: false, stuck: false, t }));
    add(0, 500, () => drawPerson(b, 840, 500, LOOKS.clerk, 'd', 0, { moving: false, run: false, busy: false, stuck: false, t }));

    // lifts/stairs state hints
    s.links.forEach((ls, li) => {
      const l = LINKS[li], padx = l.a.x / 2, pady = l.a.y / 2;
      if (l.kind === 'stairs' && ls.oneWayUntil > s.t) add(0, pady + 30, () => bubble(b, 'DOWN ONLY', Math.round(padx + 10), Math.round(pady - 16), '#ffd23f'));
      if (l.kind === 'lift' && ls.jamUntil > s.t) add(0, pady + 30, () => bubble(b, 'LIFT JAMMED', Math.round(padx), Math.round(pady - 18), '#ffa030'));
    });

    // obstacle props
    for (const f of s.fx) {
      if (!f.rect) continue;
      const [x0, y0, x1, y1] = f.rect, mx = (x0 + x1 + 1) * 8, my = (y0 + y1 + 1) * 8 + 6, lv = (f.lv ?? 0) as Lv;
      if (f.kind === 'block') {
        if (f.id === 'cow_on_bridge') add(lv, my, () => drawCow(b, mx, my, t));
        else if (f.id === 'sleeping_passenger') add(lv, my, () => drawSleeper(b, mx, my, t));
        else if (f.id === 'trolley_jam') add(lv, my + 8, () => { drawTrolley(b, mx - 10, my + 8); drawTrolley(b, mx + 14, my + 8); });
        else add(lv, my, () => drawBarricade(b, mx, my));
      } else if (f.kind === 'slow') {
        if (f.id === 'chai_spill') add(lv, my, () => drawPuddle(b, mx, my));
        else {
          const n = Math.min(9, Math.max(3, Math.round(((x1 - x0 + 1) * (y1 - y0 + 1)) / 14)));
          for (let i = 0; i < n; i++) {
            const px = x0 * 16 + 6 + hash(i, x0, 1) * ((x1 - x0 + 1) * 16 - 12), py = y0 * 16 + 18 + hash(i, y0, 2) * ((y1 - y0 + 1) * 16 - 20);
            const sway = Math.sin(t * 2 + i) * 1.2, look = npcLook(i * 13 + x0), face: Face = hash(i, 3, 3) > 0.5 ? 'l' : 'r';
            add(lv, py, () => drawPerson(b, px + sway, py, look, face, 0, { moving: false, run: false, busy: i % 3 === 0, stuck: false, t: t + i }));
          }
          if (f.id === 'construction_block') for (let i = x0; i <= x1; i += 3) add(lv, y0 * 16 + 14, () => drawCone(b, i * 16 + 8, y0 * 16 + 14));
        }
      }
      void CROWD_IDS; void DEF_BY_ID;
    }

    s.bags.forEach((bag, i) => {
      if (bag.carriedBy || bag.loaded) return;
      const bx = bag.pos.x / 2, by = bag.pos.y / 2 + 4;
      add(0, by, () => { drawBag(b, bx, by, i); if (Math.floor(t * 2) % 2 === 0) R(b, bx - 1, by - 14, 3, 3, '#ffd23f'); });
    });

    // friends
    for (const f of s.friends as Friend[]) {
      if (f.boarded) { if (!this.boardedSeen.has(f.id)) { this.boardedSeen.add(f.id); const a = this.anims.get(f.id); if (a) this.spark(a.x / 2, a.y / 2, 14, ['#ffd23f', '#ffffff', '#6ab0ff']); } continue; }
      const mv = this.mover(e, f);
      if (mv.hidden) { const lx = mv.pos.x / 2, ly = mv.pos.y / 2; add(mv.lv, ly + 20, () => bubble(b, f.role.toUpperCase()[0] + ' IN LIFT', Math.round(lx), Math.round(ly - 26), '#cfe8ff')); continue; }
      const a = this.anim(f.id, mv.pos, dt);
      const fx = mv.pos.x / 2, fy = mv.pos.y / 2 + 6, stuck = f.state === 'stuck', moving = !stuck && a.speed > 4;
      const pose: Pose = { moving, run: a.speed > 60, busy: f.state === 'working' && f.heldDoor === null && f.role !== 'scout', stuck, t };
      if (pose.run) this.dust(a, fx, fy, dt);
      add(mv.lv, fy, () => {
        drawPerson(b, fx, fy, LOOKS[f.role], a.face, Math.floor(a.dist / 8) & 3, pose);
        if (f.carrying > 0 && f.role === 'loader') for (let i = 0; i < f.carrying; i++) drawBag(b, fx, fy - 17 - i * 8, i + 1);
        const nm = f.role.toUpperCase();
        text(b, nm, Math.round(fx - textW(nm) / 2), Math.round(fy - 26), ROLE_COLOR[f.role], 1, '#161616');
        let msg = '', bg = '#ffffff', fg = '#161616';
        if (stuck) { msg = s.t - (f.stuckSince ?? s.t) > 3000 ? 'SOS!' : '!?'; const on = Math.floor(t * 4) % 2; bg = on ? '#ff4a3a' : '#ffffff'; fg = on ? '#ffffff' : '#ff4a3a'; }
        else if (s.t < f.flashUntil) { msg = '!'; bg = '#ffd23f'; }
        else if (f.heldDoor !== null) { msg = 'HOLD'; bg = '#8ee07a'; }
        else if (f.override?.kind === 'ping') msg = '>';
        else if (f.state === 'working') msg = '...';
        if (msg) bubble(b, msg, Math.round(fx), Math.round(fy - 28), bg, fg);
      });
    }

    // player
    const p = s.player;
    if (p.boarded) { if (!this.boardedSeen.has('player')) { this.boardedSeen.add('player'); this.spark(p.pos.x / 2, p.pos.y / 2, 20, ['#ffd23f', '#ffffff', '#ff7a6a']); } }
    else if (pm.hidden) { const lx = pm.pos.x / 2, ly = pm.pos.y / 2; add(pm.lv, ly + 24, () => bubble(b, 'YOU IN LIFT', Math.round(lx), Math.round(ly - 26), '#ffd23f')); }
    else {
      const a = this.anim('player', pm.pos, dt);
      const fx = pm.pos.x / 2, fy = pm.pos.y / 2 + 6, moving = a.speed > 4, pose: Pose = { moving, run: a.speed > 60, busy: false, stuck: false, t };
      if (pose.run) this.dust(a, fx, fy, dt);
      add(pm.lv, fy, () => {
        drawPerson(b, fx, fy, LOOKS.player, a.face, Math.floor(a.dist / 8) & 3, pose);
        for (let i = 0; i < p.carrying; i++) drawBag(b, fx + (i % 2 ? -8 : 8), fy - 1 - Math.floor(i / 2) * 2, i);
        const bo = Math.round(Math.sin(t * 6) * 1.5), X = Math.round(fx);
        R(b, X - 2, fy - 37 + bo, 5, 1, '#161616'); R(b, X - 1, fy - 36 + bo, 3, 1, '#161616'); R(b, X, fy - 35 + bo, 1, 1, '#161616');
        R(b, X - 1, fy - 37 + bo, 3, 1, '#ffd23f'); R(b, X, fy - 36 + bo, 1, 1, '#ffd23f');
        text(b, 'YOU', X - 5, Math.round(fy - 27), '#ffffff', 1, '#161616');
        if (s.t < p.stallUntil) bubble(b, '...', X, Math.round(fy - 40));
      });
    }

    const sorted = (lv: Lv) => items.filter((i) => i.lv === lv).sort((a, c) => a.y - c.y);
    for (const it of sorted(0)) it.draw();
    b.globalAlpha = 0.94; b.drawImage(this.deck, 0, 0); b.globalAlpha = 1;
    for (const it of sorted(1)) it.draw();

    this.guideLayer(e, b, t);

    for (const q of this.parts) {
      q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 90 * dt;
      b.globalAlpha = Math.max(0, 1 - q.life / q.max); R(b, Math.round(q.x), Math.round(q.y), 2, 2, q.col); b.globalAlpha = 1;
    }
    this.parts = this.parts.filter((q) => q.life < q.max);
    b.restore();

    const pr = clamp(s.t / 150000, 0, 1), lerp = (a: number, c: number) => Math.round(a + (c - a) * pr);
    b.globalCompositeOperation = 'multiply';
    R(b, 0, 0, VW, VH, `rgb(${lerp(255, 190)},${lerp(244, 165)},${lerp(224, 214)})`);
    b.globalCompositeOperation = 'source-over';

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buf, 0, 0, CW, CH);
    this.overlay(e, cx, cy);
  }

  /** Breadcrumb trail, target marker and stairs/lift callout: the "what do I do next" layer. */
  private guideLayer(e: Engine, b: Ctx, t: number) {
    const g = e.guide;
    if (e.s.player.boarded) return;
    g.crumbs.forEach((c, i) => {
      const on = (Math.floor(t * 6) + i) % 6 === 0;
      const x = Math.round(c.x / 2), y = Math.round(c.y / 2) + 4;
      R(b, x - 2, y - 1, 5, 5, '#161616'); R(b, x - 1, y, 3, 3, on ? '#ffffff' : '#ffd23f');
    });
    if (g.nextLink) {
      const x = Math.round(g.nextLink.x / 2), y = Math.round(g.nextLink.y / 2), bo = Math.round(Math.sin(t * 6) * 2);
      bubble(b, g.nextLink.label, x, y - 24 + bo, '#5fe08a');
    }
    if (g.target) {
      const x = Math.round(g.target.x / 2), y = Math.round(g.target.y / 2), bo = Math.round(Math.sin(t * 5) * 2);
      bubble(b, g.target.label, x, y - 30 + bo, '#ffd23f');
      R(b, x - 3, y - 14 + bo, 7, 1, '#161616'); R(b, x - 2, y - 13 + bo, 5, 1, '#161616'); R(b, x - 1, y - 12 + bo, 3, 1, '#161616'); R(b, x, y - 11 + bo, 1, 1, '#161616');
      const on = Math.floor(t * 3) % 2 === 0;
      R(b, x - 9, y + 2, 19, 1, on ? '#ffd23f' : '#fff7c0'); R(b, x - 9, y + 8, 19, 1, on ? '#ffd23f' : '#fff7c0');
    }
    const s = e.s;
    if (s.train.state === 'open') for (const i of [s.coach * 2, s.coach * 2 + 1]) {
      const d = doorWorld(s.train.left, s.train.platform, i), x = Math.round(d.x / 2), y = Math.round(d.y / 2) - 2, bo = Math.round(Math.sin(t * 6) * 1.5);
      const open = e.doorOpen(i);
      R(b, x - 3, y - 6 + bo, 7, 1, '#161616'); R(b, x - 2, y - 5 + bo, 5, 1, '#161616'); R(b, x - 1, y - 4 + bo, 3, 1, '#161616');
      R(b, x - 2, y - 6 + bo, 5, 1, open ? '#5fe08a' : '#ff4a3a'); R(b, x - 1, y - 5 + bo, 3, 1, open ? '#5fe08a' : '#ff4a3a');
    }
  }

  private overlay(e: Engine, cx: number, cy: number) {
    const s = e.s, c = this.ctx;
    const toScreen = (wx: number, wy: number) => ({ x: (wx / 2 - cx) * SC, y: (wy / 2 - cy) * SC });
    const arrow = (wx: number, wy: number, col: string, label: string) => {
      const p = toScreen(wx, wy);
      if (p.x > 24 && p.x < CW - 24 && p.y > 24 && p.y < CH - 24) return;
      const mx = CW / 2, my = CH / 2, dx = p.x - mx, dy = p.y - my;
      const k = Math.min((CW / 2 - 40) / Math.abs(dx || 1), (CH / 2 - 40) / Math.abs(dy || 1));
      const ax = mx + dx * k, ay = my + dy * k, ang = Math.atan2(dy, dx);
      c.save(); c.translate(ax, ay); c.rotate(ang);
      c.fillStyle = '#161616'; c.beginPath(); c.moveTo(18, 0); c.lineTo(-11, -15); c.lineTo(-11, 15); c.closePath(); c.fill();
      c.fillStyle = col; c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -9); c.lineTo(-6, 9); c.closePath(); c.fill();
      c.restore();
      text(c, label, Math.round(ax - textW(label, 2) / 2), Math.round(ay + (dy > 0 ? -34 : 20)), col, 2, '#161616');
    };
    for (const f of s.friends) if (f.state === 'stuck' && !f.boarded) arrow(f.pos.x, f.pos.y, '#ff4a3a', 'SOS');
    const g = e.guide;
    if (g.target && !s.player.boarded && g.target.lv === s.player.lv) arrow(g.target.x, g.target.y, '#ffd23f', g.target.label);
    else if (g.nextLink && !s.player.boarded) arrow(g.nextLink.x, g.nextLink.y, '#5fe08a', g.nextLink.label);

    if (s.departAt < 150000 && !e.ended) {
      const left = Math.max(0, Math.ceil((s.departAt - s.t) / 1000)), msg = `TRAIN LEAVING IN ${left}`, blink = Math.floor(this.time * 3) % 2 === 0;
      R(c, CW / 2 - textW(msg, 4) / 2 - 12, 10, textW(msg, 4) + 24, 40, '#161616');
      text(c, msg, Math.round(CW / 2 - textW(msg, 4) / 2), 20, blink ? '#ff4a3a' : '#ffffff', 4);
    }

    // minimap
    const mx = 10, my = CH - COLS * 0 - ROWS * 3 - 10, mw = COLS * 3;
    c.globalAlpha = 0.92; c.drawImage(this.mini, mx, my); c.globalAlpha = 1;
    c.strokeStyle = '#161616'; c.lineWidth = 3; c.strokeRect(mx, my, mw, ROWS * 3);
    const dot = (wx: number, wy: number, col: string, sz = 4) => { const X = mx + wx / 32 * 3, Y = my + wy / 32 * 3; R(c, X - sz / 2, Y - sz / 2, sz, sz, '#161616'); R(c, X - sz / 2 + 1, Y - sz / 2 + 1, sz - 2, sz - 2, col); };
    if (s.train.state !== 'away') for (const i of [s.coach * 2, s.coach * 2 + 1]) { const d = doorWorld(s.train.left, s.train.platform, i); R(c, mx + d.x / 32 * 3 - 3, my + d.y / 32 * 3 - 2, 6, 4, e.doorOpen(i) ? '#5fe08a' : '#ff4a3a'); }
    else if (s.belief.platform) { const y = PF[s.belief.platform].y0 * 3; R(c, mx + 20, my + y - 1, 150, 2, Math.floor(this.time * 2) % 2 ? '#ffd23f' : '#fff7c0'); }
    for (const f of s.friends) if (!f.boarded) dot(f.pos.x, f.pos.y, f.state === 'stuck' ? '#ff4a3a' : ROLE_COLOR[f.role]);
    if (!s.player.boarded) dot(s.player.pos.x, s.player.pos.y, '#ffd23f', 6);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1; c.strokeRect(mx + (cx * 2) / 32 * 3, my + (cy * 2) / 32 * 3, (VW * 2) / 32 * 3, (VH * 2) / 32 * 3);
    text(c, 'MAP', mx + 3, my + 3, '#ffffff', 1, '#161616');

    const gr = c.createRadialGradient(CW / 2, CH / 2, CH * 0.5, CW / 2, CH / 2, CH * 1.0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,6,20,0.4)');
    c.fillStyle = gr; c.fillRect(0, 0, CW, CH);
  }

  /** Landing-page hero: platform 1, gates, hall and forecourt, alive. */
  drawHero(dt: number) {
    this.time += dt;
    if (!this.heroBuf) this.heroBuf = makeCanvas(640, 428);
    const b = this.heroBuf.getContext('2d')!, t = this.time, ox = 180, oy = 330;
    b.imageSmoothingEnabled = false; b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, 640, 428);
    b.save(); b.translate(-ox, -oy); b.drawImage(this.ground, 0, 0);
    for (const n of this.npcs) this.stepNpc(n, dt);
    this.stepCars(dt);
    for (const c of this.cars) (c.auto ? drawAuto : drawTaxi)(b, c.x, c.y, c.dir);
    drawTrain(b, 520, 1, Array(10).fill(true), 3, t);
    const items: { y: number; draw: () => void }[] = [];
    for (const p of this.props) if (p.x > ox - 60 && p.x < ox + 700 && p.y > oy - 40 && p.y < oy + 440) items.push({ y: p.y, draw: () => p.draw(b, t) });
    items.push({ y: 560, draw: () => drawBoardBig(b, 376, 558, 1, 'S2', false, t) });
    for (const n of this.npcs) items.push({ y: n.y / 2 + 6, draw: () => drawPerson(b, n.x / 2, n.y / 2 + 6, n.look, n.face, Math.floor(n.dist / 8) & 3, { moving: n.moving, run: false, busy: false, stuck: false, t }) });
    ['player', 'scout', 'loader', 'fixer', 'anchor'].forEach((r, i) => { const x = 300 + i * 20, y = 450 + (i % 2) * 6; items.push({ y, draw: () => drawPerson(b, x, y, LOOKS[r], 'd', 0, { moving: false, run: false, busy: false, stuck: false, t: t + i }) }); });
    items.sort((a, c) => a.y - c.y).forEach((it) => it.draw());
    b.globalAlpha = 0.94; b.drawImage(this.deck, 0, 0); b.globalAlpha = 1;
    b.restore();
    b.globalCompositeOperation = 'multiply'; R(b, 0, 0, 640, 428, 'rgb(240,214,200)'); b.globalCompositeOperation = 'source-over';
    this.ctx.imageSmoothingEnabled = false; this.ctx.drawImage(this.heroBuf, 0, 0, CW, CH);
  }
}
void COLS; void ROWS; void POI;
