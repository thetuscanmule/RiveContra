import data from '@/data/settings.json';

export const SETTINGS = data as {
  smoothing:            number;
  speechSpeed:          number;
  pauseBeforeGreeting:  number;
  pauseDiceReveal:      number;
  pauseDiceRoll:        number;
  pauseBeforeResults:   number;
};
