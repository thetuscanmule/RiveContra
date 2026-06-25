import type { ReactionLines } from './types';
import data from '@/data/reactions.json';

export const GREETING_LINES = data.greeting as string[];
export const PRE_ROLL_LINES = data.preRoll as string[];
export const REACTION_LINES = data as unknown as ReactionLines;
