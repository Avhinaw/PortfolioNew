import announcements from '@/data/announcements.json';
import announcementsHi from '@/data/announcements.hi.json';
import { paArrival, paIntro, paPlatform } from '@/lib/pa-text';
import type { ActiveFx, Bag, Climb, Diff, Friend, HudSnap, Lv, Mover, ObstacleDef, Phase, Role, Say, State, Toast, TimelineEventT, Vec2, Verdict, GuideSnap } from './types';
import {
  BAG_SPOTS, COACH_NAMES, COACH_STRIDE, LINKS, PLATFORM_IDS, POI, TILE, TRAIN_LEFT_MAX, TRAIN_LEFT_MIN, WORLD_W,
  dist, doorWorld, findPath, inRect, isWalk, tileOf, type Nav,
} from './map';
import { BASE_SPEED, FRIEND_SPEED, SPEED_SCALE, missRate } from './ai/mistakes';
import { updateFriend } from './ai/behavior';
import { DEF_BY_ID, pickObstacle } from './obstacles/director';
import { applyEffect } from './obstacles/effects';
import { computeGuide } from './guide';
import { applyPing, type PingId } from './pings';
import { makeRng } from './rng';

export const MATCH_MS = 150000;
export const BAGS_TOTAL = 4;
export interface EngineOpts { seed: string; difficulty: Diff; matchId: string | null }
export interface MatchLogOut {
  id: string; seed: string; createdAt: string; durationMs: number; difficulty: Diff;
  events: TimelineEventT[]; verdict: Verdict; boardedCount: number; bagsLoaded: number; pingsSent: number; obstaclesTriggered: number;
}
export type Action = { kind: 'board' | 'pick' | 'read' | 'ticket' | 'chai' | 'link' | 'hint'; label: string; ok: boolean; run: () => void };

const ROLES: Role[] = ['scout', 'loader', 'fixer', 'anchor'];
const phaseAt = (t: number): Phase => (t < 40000 ? 'early' : t < 100000 ? 'mid' : t < 130000 ? 'late' : t < MATCH_MS ? 'boarding' : 'verdict');
const EMPTY_GUIDE: GuideSnap = { title: 'GET READY', detail: '', alert: null, checklist: [], target: null, crumbs: [], nextLink: null };

export class Engine {
  s: State;
  rng: () => number;
  events: TimelineEventT[] = [];
  toasts: Toast[] = [];
  input: Vec2 = { x: 0, y: 0 };
  lastObstacle: ObstacleDef | null = null;
  fired: Record<string, number> = {};
  obstacleCount = 0;
  pingsSent = 0;
  loaderDropped = false;
  announcement: { en: string; hi: string; at: number } | null = null;
  guide: GuideSnap = EMPTY_GUIDE;
  ended = false;
  result: MatchLogOut | null = null;
  onNeedAnnounce?: (snap: { timeRemaining: number; lastObstacle: string | null; playerCarrying: number; stuckFriendRole: Role | null }) => void;
  onEnd?: (log: MatchLogOut) => void;
  onPA?: (say: Say, kind: string) => void;
  onSfx?: (name: string) => void;

  private nextFireAt = 20000;
  private boardingFires = 0;
  private toastId = 0;
  private pingsLogged = 0;
  private guideT = 0;
  private pending: { at: number; say: Say; belief?: number }[] = [];
  private flags = { intro: false, plat: false, a40: false, a90: false, a120: false, tc: false, dep: false };

  constructor(public opts: EngineOpts) {
    this.rng = makeRng(opts.seed + (opts.matchId ?? ''));
    const rate = (r: Role) => missRate(opts.difficulty, r);
    const friends: Friend[] = ROLES.map((role, i) => ({
      id: role, role, pos: { x: (12 + i * 1.6) * TILE, y: (43 + (i % 2)) * TILE }, lv: 0, climb: null, carrying: 0,
      state: 'idle', stuckSince: null, pauseUntil: 0, override: null, path: [], pathKey: '', noPath: false,
      workLeft: role === 'fixer' ? 12 : 2, boarded: false, rescue: 0,
      reported: false, ticketDone: false, skipQueue: role === 'fixer' && this.rng() < rate('fixer'), skipLogged: false,
      wrongPlat: null, wrongUntil: 0, heldDoor: null, noHoldUntil: 0, releaseRolled: false, wrongRolled: false, flashUntil: 0, ignore: [],
    }));
    const platform = PLATFORM_IDS[Math.floor(this.rng() * 3)];
    const left = TRAIN_LEFT_MIN + 8 * Math.floor(this.rng() * ((TRAIN_LEFT_MAX - TRAIN_LEFT_MIN) / 8));
    this.s = {
      t: 0, phase: 'early',
      player: { pos: { ...POI.spawn }, lv: 0, climb: null, carrying: 0, boarded: false, stallUntil: 0, ate: false },
      friends,
      bags: BAG_SPOTS.map((p, i): Bag => ({ id: `bag${i}`, pos: { ...p }, carriedBy: null, loaded: false })),
      fx: [], blockVer: 0, linkVer: 0, links: LINKS.map(() => ({ brokenUntil: 0, jamUntil: 0, oneWayUntil: 0 })),
      train: { state: 'away', platform, drawPlat: platform, left, x: WORLD_W + 400, fromX: WORLD_W + 400, toX: left, animStart: 0, animEnd: 0 },
      coach: 1 + Math.floor(this.rng() * 4), doors: Array.from({ length: 10 }, () => ({ closedUntil: 0 })),
      board: { shows: platform, syncAt: 0, deadUntil: 0 },
      belief: { platform: null }, guessPlat: PLATFORM_IDS[Math.floor(this.rng() * 3)],
      ticketOk: false, bagsLoaded: 0, pingCd: 0, departAt: MATCH_MS, verdict: null,
    };
    this.guide = computeGuide(this);
  }

  // ---------- logging / feedback ----------
  private push(e: TimelineEventT, important = false) { if (this.events.length < (important ? 198 : 185)) this.events.push(e); }
  private T() { return Math.round(this.s.t); }
  logMistake(role: Role, kind: string) { this.push({ t: this.T(), type: 'mistake', role, kind }); }
  logPing(id: string, targetRole?: Role) { if (this.pingsLogged++ < 30) this.push({ t: this.T(), type: 'ping', pingId: id, ...(targetRole ? { targetRole } : {}) }); }
  toast(icon: string, text: string) { this.toasts.push({ id: ++this.toastId, icon, text, until: this.s.t + 6000 }); if (this.toasts.length > 4) this.toasts.shift(); }
  sfx(n: string) { this.onSfx?.(n); }
  /** A railway-style PA announcement: shown on the HUD, chimed and spoken. */
  pa(say: Say | string, kind = 'info', belief?: number) {
    const sy: Say = typeof say === 'string' ? { en: say, hi: say } : say;
    this.announcement = { ...sy, at: this.s.t };
    if (belief !== undefined) this.s.belief.platform = belief;
    this.onPA?.(sy, kind);
  }
  schedulePA(at: number, say: Say, belief?: number) { this.pending.push({ at, say, belief }); }
  setAnnouncement(text: string) { this.pa({ en: text, hi: text }, 'flavor'); }

  // ---------- world queries ----------
  addFx(fx: ActiveFx) { this.s.fx.push(fx); if (fx.kind === 'block') this.s.blockVer++; }
  blocked = (tx: number, ty: number, lv: Lv) => this.s.fx.some((f) => f.kind === 'block' && f.rect && (f.lv ?? 0) === lv && inRect(tx, ty, f.rect));
  zoneMult(p: Vec2, lv: Lv = 0) {
    const { tx, ty } = tileOf(p);
    return this.s.fx.reduce((m, f) => (f.kind === 'slow' && f.rect && (f.lv ?? 0) === lv && inRect(tx, ty, f.rect) ? Math.min(m, f.mult ?? 1) : m), 1);
  }
  inSlowZone(p: Vec2, lv: Lv = 0) { return this.zoneMult(p, lv) < 1; }
  private slowAll() { return this.s.fx.reduce((m, f) => (f.kind === 'slow_all' ? m * (f.mult ?? 1) : m), 1); }
  linkOk(li: number, dir: 1 | -1) {
    const ls = this.s.links[li], l = LINKS[li], t = this.s.t;
    if (ls.brokenUntil > t) return false;
    if (ls.oneWayUntil > t && l.kind === 'stairs' && dir === 1) return false;
    return true;
  }
  nav(carrying: number): Nav {
    return {
      blocked: this.blocked, linkOk: (li, dir) => this.linkOk(li, dir),
      linkCost: (li) => { const l = LINKS[li], ls = this.s.links[li]; let c = l.kind === 'stairs' ? 12 : 22; if (l.kind === 'stairs' && carrying >= 2) c += 8; if (ls.jamUntil > this.s.t) c += 30; return c; },
    };
  }
  doorOpen(i: number) { return this.s.train.state === 'open' && this.s.t < this.s.departAt && this.s.t >= this.s.doors[i].closedUntil; }
  doorIndexAt(p: Vec2): number | null {
    if (this.s.train.state !== 'open') return null;
    for (const i of [this.s.coach * 2, this.s.coach * 2 + 1]) if (dist(p, doorWorld(this.s.train.left, this.s.train.platform, i)) < 30) return i;
    return null;
  }

  // ---------- obstacles & friends ----------
  fire(def: ObstacleDef) {
    this.fired[def.id] = (this.fired[def.id] ?? 0) + 1;
    this.obstacleCount++; this.lastObstacle = def;
    this.push({ t: this.T(), type: 'obstacle_trigger', obstacleId: def.id });
    this.toast(def.icon, `${def.name}. ${def.announcement}`);
    if (def.layer !== 'consequence') this.pa({ en: def.announcement, hi: def.announcement_hi ?? def.announcement }, 'obstacle');
    this.sfx('alert');
    applyEffect(this, def);
    const l = this.s.friends.find((f) => f.role === 'loader');
    if (l && !l.boarded && l.state !== 'stuck' && l.carrying > 0 && this.rng() < missRate(this.opts.difficulty, 'loader') * 0.9) this.dropBag(l);
  }
  dropBag(f: Friend) {
    const bag = this.s.bags.find((b) => b.carriedBy === f.role);
    if (!bag) return;
    bag.carriedBy = null; bag.pos = { x: f.pos.x + 14, y: f.pos.y + 8 };
    f.carrying--; this.loaderDropped = true;
    if (this.rng() < 0.5) f.ignore.push(bag.id);
    this.push({ t: this.T(), type: 'bag_dropped', friendId: f.role });
    this.toast('🎒', `Your ${f.role} dropped a bag.`);
  }
  stick(f: Friend) {
    if (f.state === 'stuck' || f.boarded || f.climb) return;
    f.state = 'stuck'; f.stuckSince = this.s.t; f.path = []; f.pathKey = '';
    this.push({ t: this.T(), type: 'friend_stuck', friendId: f.role, role: f.role });
    this.toast('🆘', `Your ${f.role} is stuck!`); this.sfx('alert');
  }
  free(f: Friend, auto = false) {
    f.state = 'idle'; f.stuckSince = null; f.rescue = 0;
    this.push({ t: this.T(), type: 'friend_rescued', friendId: f.role });
    this.toast('✅', auto ? `Your ${f.role} got free on their own.` : `You rescued your ${f.role}.`);
  }
  scoutReport(f: Friend) {
    const s = this.s;
    f.reported = true; f.state = 'idle';
    let plat = s.board.shows;
    if (this.rng() < missRate(this.opts.difficulty, 'scout')) { const o = PLATFORM_IDS.filter((p) => p !== plat); plat = o[Math.floor(this.rng() * o.length)]; }
    s.belief.platform = plat;
    this.push({ t: this.T(), type: 'scout_report', platform: plat, correct: plat === s.train.platform });
    this.toast('🔍', `Your Scout: "It's Platform ${plat}!"`);
  }

  // ---------- stairs & lifts ----------
  startClimb(m: Mover, li: number, dir: 1 | -1, isPlayer = false) {
    const l = LINKS[li], ls = this.s.links[li];
    let secs = l.secs + (l.kind === 'stairs' && m.carrying >= 2 ? 2 : 0);
    if (ls.jamUntil > this.s.t) { secs += 10; if (isPlayer) this.toast('🛗', 'The lift is jammed. This will take a while...'); }
    m.climb = { link: li, dir, start: this.s.t, until: this.s.t + secs * 1000 } as Climb;
    if (isPlayer) this.toast(l.kind === 'stairs' ? '🪜' : '🛗', `${l.kind === 'stairs' ? 'Climbing the stairs' : 'Waiting for the lift'} (${secs}s)...`);
  }
  tickClimb(m: Mover): boolean {
    const c = m.climb;
    if (!c) return false;
    if (this.s.t < c.until) return true;
    const l = LINKS[c.link];
    m.pos = { ...(c.dir === 1 ? l.b : l.a) }; m.lv = c.dir === 1 ? 1 : 0; m.climb = null;
    return false;
  }

  // ---------- doors / boarding ----------
  private loadBags(who: 'player' | Role) { for (const b of this.s.bags) if (b.carriedBy === who) { b.loaded = true; b.carriedBy = null; this.s.bagsLoaded++; } }
  boardFriend(f: Friend) {
    if (f.boarded) return;
    f.boarded = true; f.state = 'idle'; f.heldDoor = null; this.loadBags(f.role); f.carrying = 0;
    this.push({ t: this.T(), type: 'boarded', entityId: f.role }, true);
    this.toast('🚆', `Your ${f.role} boarded!`); this.sfx('board');
  }
  private boardPlayer() {
    const p = this.s.player;
    p.boarded = true; this.loadBags('player'); p.carrying = 0;
    this.push({ t: this.T(), type: 'boarded', entityId: 'player' }, true);
    this.toast('🚆', 'You boarded! Now watch your friends.'); this.sfx('board');
  }

  // ---------- movement ----------
  walk(f: Friend, target: Vec2, dt: number) {
    const tl = tileOf(target), key = `${tl.tx},${tl.ty},${this.s.blockVer},${this.s.linkVer}`;
    if (f.pathKey !== key) {
      const p = findPath(f.pos, f.lv, target, 0, this.nav(f.carrying));
      f.path = p ?? []; f.noPath = p === null; f.pathKey = key;
    }
    if (f.noPath) { f.state = 'idle'; return; }
    const wp = f.path[0] ?? target;
    const speed = BASE_SPEED[f.role] * SPEED_SCALE * FRIEND_SPEED * this.zoneMult(f.pos, f.lv) * (f.carrying > 0 ? 0.8 : 1);
    const d = dist(f.pos, wp), step = speed * dt;
    if (d <= step) {
      f.pos = { x: wp.x, y: wp.y };
      if (f.path.length) { const w = f.path.shift()!; if (w.link !== undefined) this.startClimb(f, w.link, w.dir!); }
    } else f.pos = { x: f.pos.x + ((wp.x - f.pos.x) / d) * step, y: f.pos.y + ((wp.y - f.pos.y) / d) * step };
  }
  private canStand(x: number, y: number) {
    const p = this.s.player, R = 9, cur = tileOf(p.pos), curBlocked = this.blocked(cur.tx, cur.ty, p.lv);
    for (const [dx, dy] of [[-R, -R], [R, -R], [-R, R], [R, R]]) {
      const { tx, ty } = tileOf({ x: x + dx, y: y + dy });
      if (!isWalk(tx, ty, p.lv)) return false;
      if (this.blocked(tx, ty, p.lv) && !curBlocked) return false;
    }
    return true;
  }
  private movePlayer(dt: number) {
    const s = this.s, p = s.player;
    if (s.t < p.stallUntil) return;
    let { x, y } = this.input;
    const m = Math.hypot(x, y);
    if (m < 0.05) return;
    if (m > 1) { x /= m; y /= m; }
    const speed = BASE_SPEED.player * SPEED_SCALE * this.slowAll() * (p.carrying >= 2 ? 0.6 : 1) * this.zoneMult(p.pos, p.lv);
    const nx = p.pos.x + x * speed * dt, ny = p.pos.y + y * speed * dt;
    if (this.canStand(nx, p.pos.y)) p.pos.x = nx;
    if (this.canStand(p.pos.x, ny)) p.pos.y = ny;
  }

  // ---------- player actions ----------
  currentAction(): Action | null {
    const s = this.s, p = s.player;
    if (p.boarded || s.phase === 'verdict' || p.climb) return null;
    const left = s.train.left, plat = s.train.platform;
    if (s.train.state === 'open' && p.lv === 0) {
      for (let i = 0; i < 10; i++) {
        if (dist(p.pos, doorWorld(left, plat, i)) > 56) continue;
        if (Math.floor(i / 2) === s.coach) {
          return this.doorOpen(i)
            ? { kind: 'board', ok: true, label: p.carrying ? `BOARD (${p.carrying} BAG${p.carrying > 1 ? 'S' : ''})` : 'BOARD TRAIN', run: () => this.boardPlayer() }
            : { kind: 'hint', ok: false, label: 'DOOR SHUT - WAIT', run: () => {} };
        }
        return { kind: 'hint', ok: false, label: `NOT YOUR COACH. GO TO ${COACH_NAMES[s.coach]}`, run: () => {} };
      }
    }
    for (let li = 0; li < LINKS.length; li++) {
      const l = LINKS[li], pad = p.lv === 0 ? l.a : l.b, dir: 1 | -1 = p.lv === 0 ? 1 : -1;
      if (dist(p.pos, pad) > 46) continue;
      const ok = this.linkOk(li, dir), name = l.kind === 'stairs' ? 'STAIRS' : 'LIFT';
      return ok
        ? { kind: 'link', ok: true, label: `${name} ${dir === 1 ? 'UP' : 'DOWN'} (${l.secs}S)`, run: () => this.startClimb(p, li, dir, true) }
        : { kind: 'hint', ok: false, label: `${name} ${this.s.links[li].brokenUntil > s.t ? 'BROKEN' : 'ONE-WAY'}`, run: () => {} };
    }
    const bag = p.lv === 0 ? s.bags.find((b) => !b.carriedBy && !b.loaded && dist(p.pos, b.pos) < 48) : undefined;
    if (bag && p.carrying < 3) return { kind: 'pick', ok: true, label: 'PICK UP BAG', run: () => { bag.carriedBy = 'player'; p.carrying++; if (p.carrying >= 3) this.fire(DEF_BY_ID.overpacked); } };
    if (p.lv === 0 && dist(p.pos, POI.boardStand) < 70 && s.t >= s.board.deadUntil) return { kind: 'read', ok: true, label: 'READ BOARD', run: () => { s.belief.platform = s.board.shows; this.toast('📟', `The board says Platform ${s.board.shows}, Coach ${COACH_NAMES[s.coach]}.`); } };
    if (p.lv === 0 && dist(p.pos, POI.boardStand) < 70) return { kind: 'hint', ok: false, label: 'BOARD IS DEAD', run: () => {} };
    if (!s.ticketOk && p.lv === 0 && dist(p.pos, POI.counter) < 64) return { kind: 'ticket', ok: true, label: 'BUY TICKETS', run: () => { s.ticketOk = true; p.stallUntil = s.t + 3000; this.toast('🎫', 'Tickets bought. The queue noticed.'); } };
    if (!p.ate && p.lv === 0 && dist(p.pos, POI.food) < 64) return { kind: 'chai', ok: true, label: 'BUY CHAI', run: () => {
      const r = this.rng();
      if (r < 0.2) this.fire(DEF_BY_ID.no_network); else if (r < 0.35) this.fire(DEF_BY_ID.upi_failure);
      else { p.ate = true; p.stallUntil = s.t + 2000; this.toast('☕', 'Chai acquired. Hunger postponed.'); }
    } };
    return null;
  }
  act() { const a = this.currentAction(); if (a?.ok) { a.run(); this.sfx('click'); } }
  ping(id: PingId) { const ok = applyPing(this, id); if (ok) this.sfx('ping'); return ok; }

  // ---------- main loop ----------
  step(dtReal: number) {
    if (this.ended) return;
    const dt = Math.min(dtReal, 0.05), n = this.s.player.boarded ? 3 : 1;
    for (let i = 0; i < n && !this.ended; i++) this.tick(dt);
  }
  private pickLocal(): Say { const i = Math.floor(this.rng() * announcements.length); return { en: announcements[i], hi: announcementsHi[i] }; }

  private tick(dt: number) {
    const s = this.s;
    s.t += dt * 1000; s.phase = phaseAt(s.t); s.pingCd = Math.max(0, s.pingCd - dt * 1000);

    const before = s.fx.length, hadBlock = s.fx.some((f) => f.kind === 'block' && f.until <= s.t);
    s.fx = s.fx.filter((f) => f.until > s.t);
    if (hadBlock || s.fx.length !== before) s.blockVer++;
    if (s.links.some((l) => (l.brokenUntil && l.brokenUntil <= s.t) || (l.oneWayUntil && l.oneWayUntil <= s.t))) {
      for (const l of s.links) { if (l.brokenUntil <= s.t) l.brokenUntil = 0; if (l.oneWayUntil <= s.t) l.oneWayUntil = 0; if (l.jamUntil <= s.t) l.jamUntil = 0; }
      s.linkVer++;
    }
    this.toasts = this.toasts.filter((t) => t.until > s.t);
    if (s.board.syncAt && s.t >= s.board.syncAt) { s.board.shows = s.train.platform; s.board.syncAt = 0; }
    for (const q of this.pending) if (s.t >= q.at) { this.pa(q.say, 'platform', q.belief); q.at = Infinity; }
    this.pending = this.pending.filter((q) => q.at !== Infinity);

    this.updateTrain();

    // railway PA: welcome, platform call, flavour lines
    const coachName = COACH_NAMES[s.coach];
    if (!this.flags.intro && s.t >= 2500) { this.flags.intro = true; this.pa(paIntro(), 'intro'); }
    if (!this.flags.plat && s.t >= 26000) { this.flags.plat = true; this.pa(paPlatform(s.train.platform, coachName), 'platform', s.train.platform); }
    if (!this.flags.a40 && s.t >= 52000) { this.flags.a40 = true; this.pa(this.pickLocal(), 'flavor'); }
    if (!this.flags.a90 && s.t >= 90000) {
      this.flags.a90 = true;
      const stuck = s.friends.find((f) => f.state === 'stuck');
      if (this.onNeedAnnounce) this.onNeedAnnounce({ timeRemaining: MATCH_MS - s.t, lastObstacle: this.lastObstacle?.id ?? null, playerCarrying: s.player.carrying, stuckFriendRole: stuck?.role ?? null });
      else this.pa(this.pickLocal(), 'flavor');
    }
    if (!this.flags.a120 && s.t >= 120000) { this.flags.a120 = true; this.pa(this.pickLocal(), 'flavor'); }

    if (s.t >= this.nextFireAt && s.t < 146000) {
      if (!(s.phase === 'boarding' && this.boardingFires >= 1)) {
        const def = pickObstacle(this);
        if (def) { this.fire(def); if (s.phase === 'boarding') this.boardingFires++; }
      }
      this.nextFireAt = s.t + 18000 + this.rng() * 4000;
    }
    if (!this.flags.tc && s.t >= 130000 && !s.ticketOk && s.train.state === 'open') { this.flags.tc = true; this.fire(DEF_BY_ID.ticket_not_printed); }
    if (!this.flags.dep && s.train.state === 'open' && s.t >= 116000 && !this.fired.train_starting) { this.flags.dep = true; this.fire(DEF_BY_ID.train_starting); }

    if (s.player.climb) this.tickClimb(s.player); else this.movePlayer(dt);
    for (const f of s.friends) {
      if (f.state === 'stuck' && !s.player.boarded && f.lv === s.player.lv && !s.player.climb && dist(f.pos, s.player.pos) < 44) { f.rescue += dt; if (f.rescue >= 1) this.free(f); } else f.rescue = 0;
      updateFriend(this, f, dt);
    }
    for (const b of s.bags) {
      if (b.carriedBy === 'player') b.pos = { x: s.player.pos.x + 12, y: s.player.pos.y - 14 };
      else if (b.carriedBy) { const f = s.friends.find((x) => x.role === b.carriedBy); if (f) b.pos = { x: f.pos.x + 12, y: f.pos.y - 14 }; }
    }
    this.guideT -= dt;
    if (this.guideT <= 0) { this.guide = computeGuide(this); this.guideT = 0.4; }
    if (s.t >= Math.min(MATCH_MS, s.departAt)) this.finish();
  }

  private assignWrong(f: Friend) {
    const s = this.s, mult = f.role === 'scout' ? 1.7 : 1.3;
    if (this.rng() < missRate(this.opts.difficulty, f.role) * mult) {
      const o = PLATFORM_IDS.filter((p) => p !== s.train.platform);
      f.wrongPlat = o[Math.floor(this.rng() * o.length)]; f.wrongUntil = s.t + 25000 + this.rng() * 20000; f.path = []; f.pathKey = '';
      this.logMistake(f.role, f.role === 'scout' ? 'follows_crowd' : f.role === 'anchor' ? 'wrong_door' : 'wrong_platform');
    } else f.wrongPlat = null;
  }

  private updateTrain() {
    const s = this.s, tr = s.train;
    if (tr.state === 'away' && s.t >= 100000) {
      tr.state = 'arriving'; tr.drawPlat = tr.platform; tr.fromX = WORLD_W + 400; tr.toX = tr.left; tr.animStart = s.t; tr.animEnd = s.t + 5000;
      s.belief.platform = tr.platform; s.board.shows = tr.platform;
      this.pa(paArrival(tr.platform), 'arrival', tr.platform);
      this.toast('🚆', `The train is arriving on Platform ${tr.platform}!`); this.sfx('horn');
      for (const f of s.friends) if (!f.boarded) this.assignWrong(f);
    }
    if (tr.state === 'arriving') {
      const k = Math.min(1, (s.t - tr.animStart) / (tr.animEnd - tr.animStart));
      tr.x = tr.fromX + (tr.toX - tr.fromX) * (1 - Math.pow(1 - k, 3));
      if (k >= 1) { tr.state = 'open'; tr.x = tr.toX; this.sfx('doors'); }
    } else if (tr.state === 'moving') {
      const k = Math.min(1, (s.t - tr.animStart) / (tr.animEnd - tr.animStart));
      if (k < 0.5) { tr.x = tr.fromX + (WORLD_W + 500 - tr.fromX) * (k * 2); }
      else { tr.drawPlat = tr.platform; tr.x = WORLD_W + 500 + (tr.toX - WORLD_W - 500) * (1 - Math.pow(1 - (k - 0.5) * 2, 3)); }
      if (k >= 1) { tr.state = 'open'; tr.x = tr.toX; s.belief.platform = tr.platform; this.sfx('doors'); for (const f of s.friends) if (!f.boarded) this.assignWrong(f); }
    }
  }

  // ---------- snapshot / end ----------
  snapshot(): HudSnap {
    const s = this.s, act = this.currentAction();
    return {
      tMs: Math.min(MATCH_MS, s.t), phase: s.phase, carrying: s.player.carrying,
      friends: s.friends.map((f) => ({
        role: f.role, status: f.boarded ? 'boarded' : s.verdict ? 'left' : f.state === 'stuck' ? 'stuck' : f.state === 'working' ? 'working' : 'ok',
        sos: f.state === 'stuck' && s.t - (f.stuckSince ?? s.t) > 3000,
      })),
      toasts: [...this.toasts], announcement: this.announcement, pingCd: s.pingCd,
      prompt: act?.label ?? null, promptOk: act?.ok ?? false, stalled: s.t < s.player.stallUntil, climbing: !!s.player.climb,
      boarded: s.player.boarded, boardedCount: this.boardedCount(), belief: s.belief.platform,
      trainPlatform: s.train.state === 'away' ? null : s.train.platform,
      departIn: s.departAt < MATCH_MS ? Math.max(0, Math.ceil((s.departAt - s.t) / 1000)) : null,
      coach: COACH_NAMES[s.coach], verdict: s.verdict, guide: this.guide,
    };
  }
  boardedCount() { return (this.s.player.boarded ? 1 : 0) + this.s.friends.filter((f) => f.boarded).length; }

  private finish() {
    const s = this.s;
    this.ended = true; s.phase = 'verdict'; s.t = Math.min(MATCH_MS, s.departAt); s.train.state = 'left';
    const endT = Math.round(s.t);
    this.sfx('depart');
    for (const f of s.friends) if (!f.boarded) this.push({ t: endT, type: 'left_behind', entityId: f.role, role: f.role }, true);
    if (!s.player.boarded) this.push({ t: endT, type: 'left_behind', entityId: 'player' }, true);
    const n = this.boardedCount();
    s.verdict = n === 0 ? 'total_miss' : n === 5 ? (s.bagsLoaded >= BAGS_TOTAL ? 'perfect' : 'clean') : n === 1 && s.player.boarded ? 'solo' : 'partial';
    this.result = {
      id: this.opts.matchId ?? 'offline', seed: this.opts.seed, createdAt: new Date().toISOString(), durationMs: endT, difficulty: this.opts.difficulty,
      events: this.events, verdict: s.verdict, boardedCount: n, bagsLoaded: s.bagsLoaded, pingsSent: this.pingsSent, obstaclesTriggered: this.obstacleCount,
    };
    this.onEnd?.(this.result);
  }
}
void COACH_STRIDE;
