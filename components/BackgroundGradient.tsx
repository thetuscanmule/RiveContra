'use client';

import { SETTINGS, ThemeKey } from '@/lib/game/settings';

interface Props {
  theme: ThemeKey;
}

const THEME_KEYS: ThemeKey[] = ['default', 'win', 'lose'];

export function BackgroundGradient({ theme }: Props) {
  const { themes } = SETTINGS.background;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {THEME_KEYS.map(key => {
        const { inner, outer, falloff } = themes[key];
        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at center, ${inner} 0%, ${outer} ${falloff}%)`,
              opacity: theme === key ? 1 : 0,
              transition: 'opacity 1.5s ease',
            }}
          />
        );
      })}

      {/* Procedural grain via SVG feTurbulence */}
      {SETTINGS.grain > 0 && (
        <>
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <filter id="bg-grain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
            </defs>
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: SETTINGS.grain,
            filter: 'url(#bg-grain)',
            mixBlendMode: 'overlay',
          }} />
        </>
      )}
    </div>
  );
}
