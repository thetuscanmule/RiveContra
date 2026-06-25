import { SETTINGS } from './settings';

export function playClickSound() {
  const clip = SETTINGS.audio.ui?.click;
  if (!clip?.src) return;
  const a = new Audio(clip.src);
  a.volume = clip.volume;
  a.play().catch(() => {});
}
