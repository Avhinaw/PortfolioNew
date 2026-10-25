import type { Engine } from '../engine';
import type { Friend, Vec2 } from '../types';
import { POI, dist, doorWorld, platformWait } from '../map';

export interface Plan { pos: Vec2 | null; kind: 'pick' | 'queue' | 'read' | 'door' | 'wait'; bagId?: string }

function doorPlan(e: Engine, f: Friend): Plan {
  const s = e.s;
  if (s.train.state === 'away') {
    const plat = s.belief.platform ?? (s.t >= 55000 ? s.guessPlat : null);
    return plat === null ? { pos: POI.wait, kind: 'wait' } : { pos: platformWait(plat), kind: 'wait' };
  }
  const plat = f.wrongPlat !== null && s.t < f.wrongUntil ? f.wrongPlat : s.train.platform;
  const mine = [s.coach * 2, s.coach * 2 + 1];
  const cost = (i: number) => dist(f.pos, doorWorld(s.train.left, plat, i)) + (plat === s.train.platform && s.train.state === 'open' && !e.doorOpen(i) ? 1500 : 0);
  const idx = f.role === 'anchor' ? mine[0] : mine.sort((a, b) => cost(a) - cost(b))[0];
  return { pos: doorWorld(s.train.left, plat, idx), kind: 'door' };
}

export function planFor(e: Engine, f: Friend): Plan {
  const s = e.s;
  switch (f.role) {
    case 'scout':
      if (!f.reported && s.train.state === 'away') return { pos: POI.boardStand, kind: 'read' };
      return doorPlan(e, f);
    case 'loader': {
      if (f.carrying < 2 && s.train.state === 'away') {
        const free = s.bags.filter((b) => !b.carriedBy && !b.loaded && !f.ignore.includes(b.id)).sort((a, b) => dist(f.pos, a.pos) - dist(f.pos, b.pos))[0];
        if (free) return { pos: free.pos, kind: 'pick', bagId: free.id };
      }
      return doorPlan(e, f);
    }
    case 'fixer':
      if (!f.ticketDone) {
        if (f.skipQueue && s.t >= 14000) return doorPlan(e, f);
        return { pos: POI.counter, kind: 'queue' };
      }
      return doorPlan(e, f);
    default:
      return doorPlan(e, f);
  }
}
