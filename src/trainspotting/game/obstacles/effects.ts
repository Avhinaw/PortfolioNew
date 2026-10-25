import type { Engine } from '../engine';
import type { Friend, Lv, ObstacleDef, Rect } from '../types';
import { LINKS, PLATFORM_IDS, ZONES, dist, doorWorld, platformWait } from '../map';
import { missRate } from '../ai/mistakes';
import { paChange, paDepart, paShift } from '@/lib/pa-text';

function resolveRect(e: Engine, fx: ObstacleDef['fx']): { rect: Rect; lv: Lv } {
  const spec = fx.rect ?? fx.zones?.[Math.floor(e.rng() * fx.zones.length)];
  if (typeof spec === 'string') return { rect: ZONES[spec].r, lv: ZONES[spec].lv };
  return { rect: spec as Rect, lv: (fx.lv ?? 0) as Lv };
}
const livePeers = (e: Engine) => e.s.friends.filter((f) => !f.boarded && f.state !== 'stuck');
const where = (p: number) => (p === 0 ? 'the main hall' : `Platform ${p}`);

export function applyEffect(e: Engine, def: ObstacleDef) {
  const s = e.s, fx = def.fx;
  const until = s.t + (fx.secs ?? 0) * 1000;

  switch (fx.kind) {
    case 'block': { const { rect, lv } = resolveRect(e, fx); e.addFx({ id: def.id, kind: 'block', rect, lv, until }); break; }
    case 'slow': { const { rect, lv } = resolveRect(e, fx); e.addFx({ id: def.id, kind: 'slow', rect, lv, mult: fx.mult, until }); break; }
    case 'slow_all': e.addFx({ id: def.id, kind: 'slow_all', mult: fx.mult, until }); break;
    case 'stall': s.player.stallUntil = Math.max(s.player.stallUntil, until); break;
    case 'board_dead': s.board.deadUntil = Math.max(s.board.deadUntil, until); break;

    case 'lift': case 'stairs_oneway': {
      const kind = fx.kind === 'lift' ? 'lift' : 'stairs';
      const idx = LINKS.map((l, i) => (l.kind === kind ? i : -1)).filter((i) => i >= 0);
      const li = idx[Math.floor(e.rng() * idx.length)], ls = s.links[li], l = LINKS[li];
      if (fx.kind === 'stairs_oneway') { ls.oneWayUntil = until; e.toast('↘️', `Stairs at ${where(l.platform)} are one-way: down only.`); }
      else if (fx.mode === 'jam') { ls.jamUntil = until; e.toast('🛗', `Lift at ${where(l.platform)} is jammed. Expect a long wait.`); }
      else { ls.brokenUntil = until; e.toast('🛗', `Lift at ${where(l.platform)} is out of order.`); }
      s.linkVer++;
      break;
    }

    case 'platform_shift': {
      const others = PLATFORM_IDS.filter((p) => p !== s.train.platform);
      const np = others[Math.floor(e.rng() * others.length)];
      if (fx.mode === 'change') {
        s.train.platform = np; s.train.drawPlat = np;
        s.board.syncAt = s.t + 18000;
        e.schedulePA(s.t + 7000, paChange(np), np);
      } else {
        s.train.platform = np;
        s.train.state = 'moving'; s.train.fromX = s.train.x; s.train.toX = s.train.left; s.train.animStart = s.t; s.train.animEnd = s.t + 6000;
        s.board.shows = np;
        e.pa(paShift(np), 'shift', np);
        e.sfx('horn');
      }
      break;
    }

    case 'door_close': {
      const mine = [s.coach * 2, s.coach * 2 + 1];
      const targets = fx.which === 'all' ? [...Array(10).keys()] : [mine.sort((a, b) => dist(s.player.pos, doorWorld(s.train.left, s.train.platform, a)) - dist(s.player.pos, doorWorld(s.train.left, s.train.platform, b)))[0]];
      const anchor = s.friends.find((f) => f.role === 'anchor');
      for (const i of targets) {
        if (anchor && anchor.heldDoor === i && !anchor.boarded && dist(anchor.pos, doorWorld(s.train.left, s.train.platform, i)) < 60) { e.toast('✋', 'Your Anchor held the door open!'); continue; }
        s.doors[i].closedUntil = Math.max(s.doors[i].closedUntil, until);
      }
      break;
    }

    case 'friend_stuck': {
      const pool = livePeers(e);
      const pick: Friend | undefined = fx.role === 'loader' ? pool.find((f) => f.role === 'loader') : pool[Math.floor(e.rng() * pool.length)];
      if (pick) e.stick(pick);
      break;
    }
    case 'drop_bag': { const l = s.friends.find((f) => f.role === 'loader'); if (l) e.dropBag(l); break; }

    case 'scatter': {
      const ref = s.train.state === 'away' ? (s.belief.platform ?? s.guessPlat) : s.train.platform;
      for (const f of livePeers(e)) {
        const others = PLATFORM_IDS.filter((p) => p !== ref), wp = others[Math.floor(e.rng() * others.length)];
        const pos = s.train.state === 'away' ? platformWait(wp) : doorWorld(s.train.left, wp, s.coach * 2 + (f.role === 'anchor' ? 0 : 1));
        f.override = { kind: 'wrong', pos, until: s.t + 14000 };
        f.path = []; f.pathKey = '';
        if (f.role === 'anchor') f.heldDoor = null;
      }
      e.logMistake('anchor', 'wrong_door');
      break;
    }
    case 'depart': {
      s.departAt = Math.min(s.departAt, s.t + (fx.secs ?? 18) * 1000);
      e.pa(paDepart(), 'depart');
      e.sfx('whistle');
      break;
    }
    case 'release_anchor': {
      const a = s.friends.find((f) => f.role === 'anchor');
      if (a && !a.boarded && a.heldDoor !== null) { a.heldDoor = null; a.noHoldUntil = s.t + 6000; e.logMistake('anchor', 'let_go_early'); }
      break;
    }
  }
}
export { missRate };
