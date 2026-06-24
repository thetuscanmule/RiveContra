'use client';

export function HexButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group btn-hex p-px bg-white/30 disabled:cursor-not-allowed"
    >
      <span className="btn-hex block px-16 py-[13px] font-body text-lg font-semibold tracking-widest text-white bg-btn transition-colors duration-150 group-hover:bg-accent group-hover:font-bold group-hover:text-black group-active:bg-white group-active:font-bold group-active:text-black group-disabled:bg-[#0f0f0f] group-disabled:text-white/20">
        {children}
      </span>
    </button>
  );
}
