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
    </div>
  );
}
