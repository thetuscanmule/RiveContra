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

/** Roll 1d8, apply luck bonus (clamped to 8), then compare against threshold. choiceIndex added by caller. */
export function resolveRoll(threshold: number, luckBonus = 0): Omit<RollResult, 'choiceIndex'> {
  const raw     = 1 + Math.floor(Math.random() * 8);
  const roll    = Math.min(8, raw + luckBonus);
  const success = roll >= threshold;
  return { roll, success, threshold, steps: success ? advanceSteps(threshold) : 0 };
}

/** Luck bonus for a given encounter index (0-based). Full on enc 0, gone by enc 3. */
export function luckBonusForTurn(luck: number, encounterIndex: number): number {
  if (encounterIndex >= 3) return 0;
  return Math.round(luck * (1 - encounterIndex / 3));
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

const AFFIRMATIVE_POOLS: Array<keyof ReactionLines['affirmative']> = ['safe', 'medium', 'risky'];

/**
 * Pick a reaction line, avoiding an immediate repeat.
 * On success, choiceIndex (0/1/2) selects the safe/medium/risky pool.
 */
export function pickReaction(
  kind: 'affirmative' | 'negative',
  choiceIndex: number,
  lastLine: string,
  lines: ReactionLines,
): string {
  if (kind === 'negative') return pickLine(lastLine, lines.negative);
  const key = AFFIRMATIVE_POOLS[choiceIndex] ?? 'medium';
  return pickLine(lastLine, lines.affirmative[key]);
}

/** Pick any line from a string pool, avoiding an immediate repeat. */
export function pickLine(lastLine: string, pool: string[]): string {
  const candidates = pool.filter(l => l !== lastLine);
  return rand(candidates.length > 0 ? candidates : pool);
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
