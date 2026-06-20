export type Option = {
  label: string;
  threshold: number; // 2–8; player succeeds if roll >= threshold
};

export type Encounter = {
  id: string;
  tier: 1 | 2 | 3;
  narration: string; // PLACEHOLDER — rewritten Phase 3
  options: [Option, Option, Option];
};

export type ReactionLines = {
  affirmative: string[]; // PLACEHOLDER — rewritten Phase 3
  negative: string[];
};

export type RollResult = {
  roll: number;      // 1–8
  success: boolean;
  threshold: number;
  steps: number;     // steps to advance on success (0 on failure)
};
