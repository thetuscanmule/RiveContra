import { SETTINGS } from './settings';

export function playHoverSound(volumeMultiplier = 1) {
  const clip = SETTINGS.audio.ui?.hover;
  if (!clip?.src) return;
  const a = new Audio(clip.src);
  a.volume = Math.min(1, Math.max(0, clip.volume * volumeMultiplier));
  a.play().catch(() => {});
}
