import type { Encounter, ReactionLines, RollResult } from './types';

/**
 * Pick an unused encounter matching the difficulty band for the current streak.
 * Bands: streak 0–4 → tier 1, 5–9 → tier 2, 10+ → tier 3.
 * Falls back to any unused encounter, then resets the pool if exhausted.
 */
export function pickEncounter(
  streak: number,
  usedIds: Set<string>,
  pool: Encounter[],
): Encounter {
  const tier = streak < 5 ? 1 : streak < 10 ? 2 : 3;

  const matchTierUnused = pool.filter(e => e.tier === tier && !usedIds.has(e.id));
  if (matchTierUnused.length > 0) return rand(matchTierUnused);

  const anyUnused = pool.filter(e => !usedIds.has(e.id));
  if (anyUnused.length > 0) return rand(anyUnused);

  // Pool exhausted — fall back to any encounter in the target tier
  const tierFallback = pool.filter(e => e.tier === tier);
  return rand(tierFallback.length > 0 ? tierFallback : pool);
}

/** Roll 1d8 and compare against threshold. */
export function resolveRoll(threshold: number): RollResult {
  const roll    = 1 + Math.floor(Math.random() * 8);
  const success = roll >= threshold;
  return { roll, success, threshold, steps: success ? advanceSteps(threshold) : 0 };
}

/**
 * Steps to advance on a successful roll.
 * Base = ceil((threshold-1)/2) so higher risk → more steps.
 * A 50/50 coin-flip adds 1 bonus step so it never feels predetermined.
 *
 *   threshold 2–3 → 1 or 2 steps
 *   threshold 4–5 → 2 or 3 steps
 *   threshold 6–7 → 3 or 4 steps
 *   threshold 8   → 4 or 5 steps
 */
export function advanceSteps(threshold: number): number {
  const base = Math.ceil((threshold - 1) / 2);
  return base + (Math.random() < 0.5 ? 1 : 0);
}

/** Human-readable step range for a given threshold, e.g. "+2–3 steps". */
export function stepRange(threshold: number): string {
  const base = Math.ceil((threshold - 1) / 2);
  return `+${base}–${base + 1} steps`;
}

/**
 * Pick a reaction line of the given kind, avoiding an immediate repeat.
 * If the pool has only one entry, it will repeat.
 */
export function pickReaction(
  kind: 'affirmative' | 'negative',
  lastLine: string,
  lines: ReactionLines,
): string {
  return pickLine(lastLine, lines[kind]);
}

/** Pick any line from a string pool, avoiding an immediate repeat. */
export function pickLine(lastLine: string, pool: string[]): string {
  const candidates = pool.filter(l => l !== lastLine);
  return rand(candidates.length > 0 ? candidates : pool);
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
