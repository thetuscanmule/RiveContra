export default function DesignSystem() {
  return (
    <div className="min-h-screen bg-[#111111] px-12 py-16 font-body">

      <header className="mb-16 border-b border-white/10 pb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Dice Quest</p>
        <h1 className="text-2xl font-semibold text-white">Design System</h1>
      </header>

      {/* ── Typography ─────────────────────────────────────────────────────── */}
      <section className="mb-20">
        <SectionLabel>Typography</SectionLabel>

        <div className="space-y-10">

          <Row label="H1">
            <h1 className="font-display text-6xl text-white">
              The Die Is Cast
            </h1>
          </Row>

          <Row label="H2">
            <h2 className="font-display text-4xl text-white">
              Choose Your Path
            </h2>
          </Row>

          <Row label="H3">
            <h3 className="font-display text-2xl text-white">
              Encounter Awaits
            </h3>
          </Row>

          <Row label="Body Large">
            <p className="max-w-xl text-base leading-relaxed text-white/70">
              You stand at the edge of the cavern, torch flickering in the damp air.
              The passage splits ahead — each route promises danger of a different kind.
              Your fate rests on a single roll.
            </p>
          </Row>

          <Row label="Body Small">
            <p className="max-w-xl text-sm leading-relaxed text-white/50">
              Roll 12 or above to succeed. Your current streak grants a +2 bonus.
              Failure ends the run and resets all progress. Choose wisely.
            </p>
          </Row>

        </div>
      </section>

      {/* ── Buttons ────────────────────────────────────────────────────────── */}
      <section className="mb-20">
        <SectionLabel>Button</SectionLabel>

        <div className="flex flex-col items-start gap-8">

          {/* Live interactive button */}
          <ButtonSwatch label="Default — interactive">
            <button className={[
              'group btn-hex p-px bg-white/30',
              '[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.2))_drop-shadow(0_4px_14px_rgba(0,0,0,0.7))]',
              'hover:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.2))_drop-shadow(0_4px_14px_rgba(0,0,0,0.7))]',
              'active:scale-[0.97] active:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.15))_drop-shadow(0_2px_8px_rgba(0,0,0,0.8))]',
              'transition-transform duration-100 disabled:cursor-not-allowed',
            ].join(' ')}>
              <span className={[
                'btn-hex block px-16 py-[13px] font-body text-lg tracking-widest transition-colors duration-150',
                'bg-[#1e1e1e] font-semibold text-white',
                'group-hover:bg-[#d4ff3e] group-hover:font-bold group-hover:text-black',
                'group-active:bg-white group-active:font-bold group-active:text-black',
              ].join(' ')}>
                Enter
              </span>
            </button>
          </ButtonSwatch>

          {/* Frozen states */}
          <div className="flex flex-wrap items-end gap-8">

            <ButtonSwatch label="Default">
              <HexBtn fill="#1e1e1e" textClass="font-semibold text-white"
                filter="drop-shadow(0 0 1px rgba(255,255,255,0.2)) drop-shadow(0 4px 14px rgba(0,0,0,0.7))" />
            </ButtonSwatch>

            <ButtonSwatch label="Hovered">
              <HexBtn fill="#d4ff3e" textClass="font-bold text-black"
                filter="drop-shadow(0 0 1px rgba(255,255,255,0.2)) drop-shadow(0 4px 14px rgba(0,0,0,0.7))" />
            </ButtonSwatch>

            <ButtonSwatch label="Pressed">
              <HexBtn fill="#ffffff" textClass="font-bold text-black" scale={0.97}
                filter="drop-shadow(0 0 1px rgba(255,255,255,0.15)) drop-shadow(0 2px 8px rgba(0,0,0,0.8))" />
            </ButtonSwatch>

            <ButtonSwatch label="Unavailable">
              <HexBtn fill="#0f0f0f" textClass="font-semibold text-white/20" filter="none" strokeOpacity={0.1} />
            </ButtonSwatch>

          </div>
        </div>
      </section>

    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">{children}</span>
      <div className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-8">
      <span className="w-24 shrink-0 text-right font-mono text-xs text-white/25">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function ButtonSwatch({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      {children}
      <span className="font-mono text-xs text-white/25">{label}</span>
    </div>
  );
}

function HexBtn({ fill, textClass, filter, scale, strokeOpacity = 0.3 }: {
  fill: string;
  textClass: string;
  filter: string;
  scale?: number;
  strokeOpacity?: number;
}) {
  return (
    <div
      className="btn-hex p-px"
      style={{
        background: `rgba(255,255,255,${strokeOpacity})`,
        filter,
        transform: scale ? `scale(${scale})` : undefined,
      }}
    >
      <span className={`btn-hex block px-16 py-[13px] font-body text-lg tracking-widest ${textClass}`}
        style={{ background: fill }}>
        Enter
      </span>
    </div>
  );
}
