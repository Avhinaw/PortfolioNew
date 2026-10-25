import type { Engine } from '../engine';
import type { Friend } from '../types';
import { dist } from '../map';
import { missRate } from './mistakes';
import { planFor } from './roles';

const ARRIVE = 16;

export function updateFriend(e: Engine, f: Friend, dt: number) {
  const s = e.s;
  if (f.boarded) return;
  if (f.climb) { e.tickClimb(f); return; }

  if (f.state === 'stuck') {
    if (s.t - (f.stuckSince ?? s.t) > 30000) e.free(f, true); // eventually the crowd thins
    return;
  }
  if (s.t < f.pauseUntil) return;

  // Loader's signature failure: gets stuck inside a crowd/slow zone.
  if (f.role === 'loader' && e.inSlowZone(f.pos, f.lv) && e.rng() < missRate(e.opts.difficulty, 'loader') * 0.25 * dt) {
    e.stick(f); return;
  }

  // Anchor's signature failure: lets go of the door too early.
  if (f.role === 'anchor' && f.heldDoor !== null && !f.releaseRolled && s.t >= 132000) {
    f.releaseRolled = true;
    if (e.rng() < missRate(e.opts.difficulty, 'anchor')) {
      f.heldDoor = null; f.noHoldUntil = s.t + 99999;
      e.logMistake('anchor', 'let_go_early');
    }
  }

  // Fixer skipping the queue gets logged when it happens.
  if (f.role === 'fixer' && f.skipQueue && !f.skipLogged && s.t >= 14000 && !f.ticketDone) {
    f.skipLogged = true; e.logMistake('fixer', 'skipped_queue');
  }

  let ov = f.override;
  if (ov && s.t >= ov.until) { f.override = null; ov = null; }
  const plan = ov ? { pos: ov.pos, kind: 'wait' as const } : planFor(e, f);

  if (!plan.pos) { f.state = 'idle'; return; }
  if (dist(f.pos, plan.pos) >= ARRIVE) {
    f.state = ov ? 'responding' : 'walking';
    e.walk(f, plan.pos, dt);
    return;
  }

  // ---- arrived ----
  if (ov) { if (ov.kind === 'ping') f.override = null; f.state = 'idle'; return; }
  switch (plan.kind) {
    case 'pick': {
      const bag = s.bags.find((b) => b.id === plan.bagId);
      if (bag && !bag.carriedBy) { bag.carriedBy = f.role; f.carrying++; }
      f.state = 'idle';
      break;
    }
    case 'queue':
      f.state = 'working';
      f.workLeft -= dt;
      if (f.workLeft <= 0) { f.ticketDone = true; s.ticketOk = true; f.state = 'idle'; e.toast('🎫', 'Your Fixer got the tickets printed.'); }
      break;
    case 'read':
      f.state = 'working';
      if (s.t < s.board.deadUntil) break; // board is dead: wait
      f.workLeft -= dt;
      if (f.workLeft <= 0) e.scoutReport(f);
      break;
    case 'door': {
      const i = e.doorIndexAt(f.pos);
      if (i === null) { f.state = 'idle'; break; }
      if (f.role === 'anchor' && s.t >= f.noHoldUntil && s.t < Math.min(146500, s.departAt - 2500)) { f.heldDoor = i; f.state = 'working'; break; }
      if (e.doorOpen(i)) e.boardFriend(f);
      else f.state = 'idle';
      break;
    }
    default: f.state = 'idle';
  }
}
