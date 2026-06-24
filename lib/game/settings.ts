import data from '@/data/settings.json';

export type Ring          = { src: string; opacity: number; scale: number; speed: number; direction: 'cw' | 'ccw' };
export type AudioClip     = { src: string; volume: number; loop: boolean };
export type TextureConfig = { src: string; size: number; opacity: number };
export type CursorSlot   = { src: string; hotspotX: number; hotspotY: number };
export type CursorConfig = { default: CursorSlot; hover: CursorSlot };
export type GradientTheme = { inner: string; outer: string; falloff: number };
export type ThemeKey      = 'default' | 'win' | 'lose';

export const SETTINGS = data as {
  cursor:     CursorConfig;
  rings:      Ring[];
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
  texture:              TextureConfig;
  audio:                { phases: Record<string, AudioClip> };
};
