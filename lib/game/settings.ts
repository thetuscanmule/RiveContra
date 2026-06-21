import data from '@/data/settings.json';

export const SETTINGS = data as {
  rive: {
    stateMachine: string;
    inputScene:   string;
    inputJawOpen: string;
  };
  smoothing:            number;
  speechSpeed:          number;
  pauseBeforeGreeting:  number;
  pauseDiceReveal:      number;
  pauseDiceRoll:        number;
  pauseBeforeResults:   number;
};
