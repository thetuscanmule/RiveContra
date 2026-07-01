'use client';

import { SETTINGS } from '@/lib/game/settings';

export function BackgroundTexture({ diceActive = false }: { diceActive?: boolean }) {
  const { src, size, opacity } = SETTINGS.texture;
  if (!src) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      opacity: diceActive ? SETTINGS.diceDim.opacity : opacity,
      transition: `opacity ${SETTINGS.diceDim.duration}ms ease`,
      pointerEvents: 'none',
      zIndex: 2,
      backgroundImage: `url('${src}')`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${size}px ${size}px`,
    }} />
  );
}
