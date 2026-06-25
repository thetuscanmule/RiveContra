'use client';

import { playClickSound } from '@/lib/game/playClickSound';
import { SETTINGS } from '@/lib/game/settings';

export function HexButton({
  children,
  onClick,
  disabled,
  innerClassName = 'px-16 py-[11px] tracking-widest',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  innerClassName?: string;
}) {
  function handleClick() {
    playClickSound();
    onClick?.();
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{ minWidth: SETTINGS.buttonMinWidth }}
      className="group btn-hex p-px bg-white/30 disabled:cursor-not-allowed"
    >
      <span className={`btn-hex block font-body text-lg font-semibold text-white bg-btn transition-colors duration-150 group-hover:bg-accent group-hover:font-bold group-hover:text-black group-active:bg-white group-active:font-bold group-active:text-black group-disabled:bg-[#0f0f0f] group-disabled:text-white/20 ${innerClassName}`}>
        {children}
      </span>
    </button>
  );
}
