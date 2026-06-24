'use client';

import { SETTINGS } from '@/lib/game/settings';

export function BackgroundTexture() {
  const { src, size, opacity } = SETTINGS.texture;
  if (!src) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      opacity,
      pointerEvents: 'none',
      zIndex: 2,
      backgroundImage: `url('${src}')`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${size}px ${size}px`,
    }} />
  );
}
