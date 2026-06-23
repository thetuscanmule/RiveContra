import data from '@/data/settings.json';

export type Ring         = { src: string; opacity: number; scale: number; speed: number; direction: 'cw' | 'ccw' };
export type GradientTheme = { inner: string; outer: string; falloff: number };
export type ThemeKey      = 'default' | 'win' | 'lose';

export const SETTINGS = data as {
  rings: Ring[];
  background: { themes: Record<ThemeKey, GradientTheme> };
  rive: {
    artboard:     string;
    stateMachine: string;
    inputScene:   string;
    inputJawOpen: string;
    inputRoll:     string;
    inputEmotion:  string;
    inputDiceWin:  string;
    inputDiceFail: string;
  };
  smoothing:            number;
  speechSpeed:          number;
  pauseBeforeGreeting:  number;
  pauseDiceReveal:      number;
  pauseDiceRoll:        number;
  pauseBeforeResults:   number;
  pauseUiFade:          number;
  riveScale:            number;
};
