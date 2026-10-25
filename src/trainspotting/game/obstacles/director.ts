import defs from '@/data/obstacles.json';
import type { Engine } from '../engine';
import type { ObstacleDef } from '../types';
import { dist, doorWorld } from '../map';
import { cascadePool } from './cascade';

export const DEFS = defs as unknown as ObstacleDef[];
export const DEF_BY_ID: Record<string, ObstacleDef> = Object.fromEntries(DEFS.map((d) => [d.id, d]));

function eligible(d: ObstacleDef, e: Engine): boolean {
  const s = e.s;
  const used = e.fired[d.id] ?? 0;
  if (used > 0 && !d.repeatable) return false;
  if (e.lastObstacle?.id === d.id) return false;
  const tv = s.train.state === 'open' || s.train.state === 'arriving';
  switch (d.requires) {
    case 'never': return false;
    case 'ticket_issue': if (s.ticketOk || s.t < 40000) return false; break;
    case 'no_food': if (s.player.ate || s.t < 60000) return false; break;
    case 'loader_dropped': if (!e.loaderDropped) return false; break;
    case 'train_visible': if (!tv) return false; break;
    case 'train_open': if (s.train.state !== 'open') return false; break;
  }
  if (d.id === 'platform_change' && (s.train.state !== 'away' || s.t > 95000)) return false;
  if (d.id === 'train_arrives_wrong_platform' && (s.train.state !== 'open' || s.t > 138000)) return false;
  if (d.id === 'train_starting' && s.t < 100000) return false;
  return true;
}

function phaseWeight(d: ObstacleDef, phase: string): number {
  switch (phase) {
    case 'early': return d.layer === 'systemic' ? 1 : 0;
    case 'mid': return d.layer === 'escalation' ? 0 : d.layer === 'consequence' ? 2 : 1;
    case 'late': return d.layer === 'escalation' ? 3 : d.layer === 'consequence' ? 2 : 0.4;
    case 'boarding': return d.layer === 'escalation' ? 3 : 0.3;
    default: return 0;
  }
}

/** State-aware scoring: the station counters whatever the player is doing well. */
function stateBoost(d: ObstacleDef, e: Engine): number {
  const s = e.s;
  let b = 1;
  const loaderStuck = s.friends.some((f) => f.role === 'loader' && f.state === 'stuck');
  if (loaderStuck && d.id === 'crowd_surge') b *= 4;
  const nearDoor = s.train.state === 'open' &&
    [s.coach * 2, s.coach * 2 + 1].some((i) => s.player.lv === 0 && dist(s.player.pos, doorWorld(s.train.left, s.train.platform, i)) < 260);
  if (nearDoor && ['coach_doesnt_exist', 'door_wont_open', 'pantry_car'].includes(d.id)) b *= 3.5;
  if (s.t > 120000 && s.player.carrying > 0 && d.id === 'train_starting') b *= 4;
  if (s.friends.some((f) => f.role === 'fixer' && f.skipQueue) && d.id === 'ticket_not_printed') b *= 3;
  return b;
}

export function pickObstacle(e: Engine): ObstacleDef | null {
  const phase = e.s.phase;
  let cands = DEFS.filter((d) => phaseWeight(d, phase) > 0 && eligible(d, e));
  if (!cands.length) return null;
  cands = cascadePool(e.lastObstacle, cands, e.rng());
  const weights = cands.map((d) => d.weight * phaseWeight(d, phase) * stateBoost(d, e));
  let r = e.rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}
