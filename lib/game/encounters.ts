import type { Encounter } from './types';
import data from '@/data/encounters.json';

export const ENCOUNTERS = data as unknown as Encounter[];
