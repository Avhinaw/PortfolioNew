import type { ObstacleDef } from '../types';

/** Cascade rule: 60% of the time, seed the next obstacle from the last one's related[]. */
export function cascadePool(last: ObstacleDef | null, candidates: ObstacleDef[], roll: number): ObstacleDef[] {
  if (!last || roll >= 0.6) return candidates;
  const seeded = candidates.filter((c) => last.related.includes(c.id));
  return seeded.length ? seeded : candidates;
}
