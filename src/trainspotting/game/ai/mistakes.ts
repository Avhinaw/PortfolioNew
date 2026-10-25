import type { Diff, Role } from '../types';

export const MISTAKE_RATES: Record<Diff, Record<Role, number>> = {
  easy:   { scout: 0.10, loader: 0.08, fixer: 0.12, anchor: 0.06 },
  normal: { scout: 0.20, loader: 0.15, fixer: 0.22, anchor: 0.12 },
  hard:   { scout: 0.32, loader: 0.26, fixer: 0.35, anchor: 0.20 },
};
export const missRate = (d: Diff, r: Role) => MISTAKE_RATES[d][r];

/** Base speeds from the spec, scaled so the station feels walkable in a 150s match. */
export const SPEED_SCALE = 1.1;
export const FRIEND_SPEED = 0.85; // friends are a bit slower than the player
export const BASE_SPEED: Record<Role | 'player', number> = { player: 100, scout: 120, loader: 70, fixer: 90, anchor: 90 };
