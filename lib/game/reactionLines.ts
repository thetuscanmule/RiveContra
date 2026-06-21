import type { ReactionLines } from './types';
import data from '@/data/reactions.json';

export const GREETING       = data.greeting;
export const PRE_ROLL_LINES = data.preRoll as string[];
export const REACTION_LINES = data as unknown as { greeting: string } & ReactionLines;
