import data from '@/data/settings.json';

export type Ring           = { src: string; opacity: number; scale: number; speed: number; direction: 'cw' | 'ccw' };
export type DialogueConfig = {
  name:    { text: string; fontSize: number; opacity: number };
  body:    { fontSize: number; opacity: number; lineHeight: number };
  divider: { src: string; width: number; opacity: number };
};
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
  pageTitle:            string;
  faviconSrc:           string;
  smoothing:            number;
  speechSpeed:          number;
  contraUrl:            string;
  pauseBeforeGreeting:  number;
  pauseBeforePreRoll:   number;
  pauseDiceReveal:      number;
  pauseDiceRoll:        number;
  pauseBeforeResults:   number;
  pauseUiFade:          number;
  dialogueFade:         number;
  luck:                 number;
  layout:               { blockOffset: number; blockOffsetMobile: number; rowGap: number; rowGapMobile: number };
  buttonMinWidth:        number;
  buttonPaddingX:        number;
  buttonPaddingY:        number;
  resultsButtonMinWidth: number;
  optionButtonMinWidth: number;
  optionButtonGap:      number;
  startScreen:          { scale: number; scaleMobile: number };
  dialogue:             DialogueConfig;
  riveScale:            { scale: number; scaleMobile: number };
  texture:              TextureConfig;
  audio:                { phases: Record<string, AudioClip>; ui: { click: AudioClip } };
};
