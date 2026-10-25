import type { Engine } from './engine';
import { dist, doorWorld, platformWait } from './map';

export type PingId = 'come_here' | 'wait' | 'help' | 'go_to_door';
export const PING_COOLDOWN_MS = 2000;
export const PING_RANGE = 260;

export function applyPing(e: Engine, id: PingId, targetRole?: undefined): boolean {
  const s = e.s;
  if (s.pingCd > 0 || s.player.boarded || s.phase === 'verdict') return false;
  const live = s.friends.filter((f) => !f.boarded && f.state !== 'stuck');
  const interrupt = (f: typeof live[number]) => {
    f.flashUntil = s.t + 500; f.pauseUntil = s.t + 500;
    f.workLeft = f.role === 'fixer' ? 14 : f.role === 'scout' ? 2 : f.workLeft; // interrupted work restarts
    f.path = []; f.pathKey = '';
  };

  if (id === 'come_here') {
    for (const f of live.filter((f) => dist(f.pos, s.player.pos) < PING_RANGE)) {
      interrupt(f); f.override = { kind: 'ping', pos: { ...s.player.pos }, until: s.t + 7000 };
    }
  } else if (id === 'wait') {
    for (const f of live) { f.flashUntil = s.t + 500; f.pauseUntil = s.t + 3000; }
  } else if (id === 'help') {
    const n = live.sort((a, b) => dist(a.pos, s.player.pos) - dist(b.pos, s.player.pos))[0];
    if (n) { interrupt(n); n.override = { kind: 'ping', pos: { ...s.player.pos }, until: s.t + 7000 }; }
  } else if (id === 'go_to_door') {
    for (const f of live) {
      interrupt(f);
      let pos;
      if (s.train.state === 'away') pos = platformWait(s.belief.platform ?? s.guessPlat);
      else { const mine = [s.coach * 2, s.coach * 2 + 1]; pos = doorWorld(s.train.left, s.train.platform, mine.sort((a, b) => dist(f.pos, doorWorld(s.train.left, s.train.platform, a)) - dist(f.pos, doorWorld(s.train.left, s.train.platform, b)))[0]); }
      f.override = { kind: 'ping', pos, until: s.t + 14000 };
    }
  }
  s.pingCd = PING_COOLDOWN_MS;
  e.pingsSent++;
  e.logPing(id, targetRole);
  return true;
}
