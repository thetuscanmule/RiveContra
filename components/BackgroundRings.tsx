'use client';

import { SETTINGS } from '@/lib/game/settings';

export function BackgroundRings({ diceActive = false }: { diceActive?: boolean }) {
  return (
    <>
      {SETTINGS.rings.map((ring, i) =>
        ring.src ? (
          <div
            key={i}
            style={{
              position: 'fixed',
              inset: 0,
              opacity: diceActive ? SETTINGS.diceDim.opacity : ring.opacity,
              transition: `opacity ${SETTINGS.diceDim.duration}ms ease`,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {/* scale wrapper — translate-centers then scales; no animation here */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '120vmin',
                height: '120vmin',
                transform: `translate(-50%, -50%) scale(${ring.scale})`,
              }}
            >
              <img
                src={ring.src}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  animation: `bg-spin ${ring.speed}s linear infinite`,
                  animationDirection: ring.direction === 'ccw' ? 'reverse' : 'normal',
                }}
              />
            </div>
          </div>
        ) : null
      )}
    </>
  );
}
