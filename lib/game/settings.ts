import data from '@/data/settings.json';

export const SETTINGS = data as {
  rive: {
    artboard:     string;
    stateMachine: string;
    inputScene:   string;
    inputJawOpen: string;
    inputRoll:    string;
    inputEmotion: string;
  };
  smoothing:            number;
  speechSpeed:          number;
  pauseBeforeGreeting:  number;
  pauseDiceReveal:      number;
  pauseDiceRoll:        number;
  pauseBeforeResults:   number;
  pauseUiFade:          number;
};
