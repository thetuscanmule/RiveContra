'use client';

import { playClickSound } from '@/lib/game/playClickSound';
import { SETTINGS } from '@/lib/game/settings';

export function HexButton({
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled,
  innerClassName = 'tracking-widest',
  outerClassName = '',
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  disabled?: boolean;
  innerClassName?: string;
  outerClassName?: string;
  style?: React.CSSProperties;
}) {
  function handleClick() {
    playClickSound();
    onClick?.();
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      style={{ minWidth: SETTINGS.buttonMinWidth, ...style }}
      className={`group btn-hex p-px bg-white/30 disabled:cursor-not-allowed ${outerClassName}`}
    >
      <span
        style={{ paddingLeft: SETTINGS.buttonPaddingX, paddingRight: SETTINGS.buttonPaddingX, paddingTop: SETTINGS.buttonPaddingY, paddingBottom: SETTINGS.buttonPaddingY }}
        className={`btn-hex block font-body text-lg font-semibold text-white bg-btn transition-colors duration-150 group-hover:bg-accent group-hover:font-bold group-hover:text-black group-active:bg-white group-active:font-bold group-active:text-black group-disabled:bg-[#0f0f0f] group-disabled:text-white/20 ${innerClassName}`}>
        {children}
      </span>
    </button>
  );
}
