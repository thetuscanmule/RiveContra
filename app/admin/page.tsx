'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Option    = { label: string; threshold: number };
type Encounter = { id: string; tier: 1 | 2 | 3; narration: string; options: [Option, Option, Option] };
type Reactions = { greeting: string; preRoll: string[]; affirmative: string[]; negative: string[] };
type RiveConfig = { stateMachine: string; inputScene: string; inputJawOpen: string };
type Settings   = { rive: RiveConfig; smoothing: number; speechSpeed: number; pauseBeforeGreeting: number; pauseDiceReveal: number; pauseDiceRoll: number; pauseBeforeResults: number };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [reactions,  setReactions]  = useState<Reactions>({ greeting: '', preRoll: [], affirmative: [], negative: [] });
  const [settings,   setSettings]   = useState<Settings>({ rive: { stateMachine: 'Game', inputScene: 'scene', inputJawOpen: 'jawOpen' }, smoothing: 0.95, speechSpeed: 0.7, pauseBeforeGreeting: 500, pauseDiceReveal: 1500, pauseDiceRoll: 2000, pauseBeforeResults: 1000 });
  const [status,     setStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg,   setErrorMsg]   = useState('');
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/admin/data')
      .then(r => r.json())
      .then(({ encounters, reactions, settings }) => {
        setEncounters(encounters);
        setReactions(reactions);
        setSettings(settings);
      });
  }, []);

  async function save() {
    setStatus('saving');
    const res = await fetch('/api/admin/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encounters, reactions, settings }),
    });
    if (res.ok) {
      setStatus('saved');
    } else {
      const body = await res.json().catch(() => ({}));
      setErrorMsg((body as { error?: string }).error ?? 'Unknown error');
      setStatus('error');
    }
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus('idle'), 3000);
  }

  // ── Encounter helpers ──

  function setNarration(i: number, v: string) {
    setEncounters(prev => prev.map((e, idx) => idx === i ? { ...e, narration: v } : e));
  }

  function setOptionLabel(ei: number, oi: number, v: string) {
    setEncounters(prev => prev.map((e, idx) => {
      if (idx !== ei) return e;
      const opts = e.options.map((o, j) => j === oi ? { ...o, label: v } : o) as [Option, Option, Option];
      return { ...e, options: opts };
    }));
  }

  function setOptionThreshold(ei: number, oi: number, v: number) {
    setEncounters(prev => prev.map((e, idx) => {
      if (idx !== ei) return e;
      const opts = e.options.map((o, j) => j === oi ? { ...o, threshold: v } : o) as [Option, Option, Option];
      return { ...e, options: opts };
    }));
  }

  function setEncounterTier(ei: number, v: 1 | 2 | 3) {
    setEncounters(prev => prev.map((e, idx) => idx === ei ? { ...e, tier: v } : e));
  }

  function addEncounter() {
    setEncounters(prev => [
      ...prev,
      {
        id: `encounter-${Date.now()}`,
        tier: 1,
        narration: '',
        options: [
          { label: '', threshold: 2 },
          { label: '', threshold: 4 },
          { label: '', threshold: 7 },
        ],
      },
    ]);
  }

  function removeEncounter(i: number) {
    setEncounters(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── Reaction helpers ──

  function setGreeting(v: string) {
    setReactions(prev => ({ ...prev, greeting: v }));
  }

  function setPreRoll(i: number, v: string) {
    setReactions(prev => {
      const p = [...prev.preRoll]; p[i] = v;
      return { ...prev, preRoll: p };
    });
  }
  function addPreRoll()         { setReactions(prev => ({ ...prev, preRoll: [...prev.preRoll, ''] })); }
  function removePreRoll(i: number) {
    setReactions(prev => ({ ...prev, preRoll: prev.preRoll.filter((_, idx) => idx !== i) }));
  }

  function setAffirmative(i: number, v: string) {
    setReactions(prev => {
      const a = [...prev.affirmative]; a[i] = v;
      return { ...prev, affirmative: a };
    });
  }

  function setNegative(i: number, v: string) {
    setReactions(prev => {
      const n = [...prev.negative]; n[i] = v;
      return { ...prev, negative: n };
    });
  }

  function addAffirmative() { setReactions(prev => ({ ...prev, affirmative: [...prev.affirmative, ''] })); }
  function addNegative()    { setReactions(prev => ({ ...prev, negative:    [...prev.negative,    ''] })); }

  function removeAffirmative(i: number) {
    setReactions(prev => ({ ...prev, affirmative: prev.affirmative.filter((_, idx) => idx !== i) }));
  }
  function removeNegative(i: number) {
    setReactions(prev => ({ ...prev, negative: prev.negative.filter((_, idx) => idx !== i) }));
  }

  // ── Render ──

  const saveLabel = status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : status === 'error' ? 'Error ✕' : 'Save all';
  const saveCls   = status === 'saved'  ? 'bg-green-600 text-white'
                  : status === 'error'  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-800';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Narrative Strings</h1>
            <p className="text-xs text-gray-400">
              Edits write to <code className="font-mono">/data/*.json</code> — commit after saving.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {status === 'error' && <p className="text-xs text-red-600">{errorMsg}</p>}
            <a href="/" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Game</a>
            <button
              onClick={save}
              disabled={status === 'saving'}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${saveCls}`}
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">

        {/* ── Rive Inputs ── */}
        <section>
          <SectionHeading title="Rive Inputs" />
          <p className="mb-3 text-xs text-gray-400">
            These must match the names in your <span className="font-mono">SkullRive.riv</span> file exactly.
            A mismatch causes silent failure — the input simply won&apos;t respond.
          </p>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">

            <RiveInputRow
              label="State machine name"
              description="The name of the state machine in your Rive editor"
              value={settings.rive.stateMachine}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, stateMachine: v } }))}
            />

            <RiveInputRow
              label="Scene input"
              description="Number input controlling which scene is visible — 0 skull · 1 dice · 2 results"
              value={settings.rive.inputScene}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, inputScene: v } }))}
            />

            <RiveInputRow
              label="Jaw open input"
              description="Number input (0–1) driving the jaw / mouth rig from audio amplitude"
              value={settings.rive.inputJawOpen}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, inputJawOpen: v } }))}
            />

          </div>
        </section>

        {/* ── Settings ── */}
        <section>
          <SectionHeading title="Settings" />
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">

            {/* Smoothing */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>Jaw smoothing</FieldLabel>
                <span className="font-mono text-xs text-gray-500">{settings.smoothing.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={settings.smoothing}
                onChange={e => setSettings(s => ({ ...s, smoothing: Number(e.target.value) }))}
                className="w-full accent-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">Controls how fluidly the jaw follows the audio amplitude. Higher = smoother but slower to react.</p>
            </div>

            {/* Speech speed */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>Speech speed</FieldLabel>
                <span className="font-mono text-xs text-gray-500">{settings.speechSpeed.toFixed(1)}×</span>
              </div>
              <input
                type="range" min={0.5} max={2.0} step={0.1}
                value={settings.speechSpeed}
                onChange={e => setSettings(s => ({ ...s, speechSpeed: Number(e.target.value) }))}
                className="w-full accent-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">ElevenLabs playback speed. 0.7 is slower and more dramatic. 1.0 is natural pace.</p>
            </div>

            {/* Pause before greeting */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Pause before greeting</FieldLabel>
                <p className="text-xs text-gray-400">Delay between &ldquo;Begin your journey&rdquo; click and the skull speaking.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} step={100}
                  value={settings.pauseBeforeGreeting}
                  onChange={e => setSettings(s => ({ ...s, pauseBeforeGreeting: Number(e.target.value) }))}
                  className="w-24 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">ms</span>
              </div>
            </div>

            {/* Dice reveal delay */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Dice reveal delay</FieldLabel>
                <p className="text-xs text-gray-400">How long the dice animation plays before the result number appears. Sync this to your Rive roll animation.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} step={100}
                  value={settings.pauseDiceReveal}
                  onChange={e => setSettings(s => ({ ...s, pauseDiceReveal: Number(e.target.value) }))}
                  className="w-24 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">ms</span>
              </div>
            </div>

            {/* Dice roll pause */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Dice hold duration</FieldLabel>
                <p className="text-xs text-gray-400">Total time in the dice phase. Result shows at reveal delay, then holds until this elapses.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} step={100}
                  value={settings.pauseDiceRoll}
                  onChange={e => setSettings(s => ({ ...s, pauseDiceRoll: Number(e.target.value) }))}
                  className="w-24 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">ms</span>
              </div>
            </div>

            {/* Pause before results */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Pause before results screen</FieldLabel>
                <p className="text-xs text-gray-400">Delay after the final failure reaction before the results screen appears.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} step={100}
                  value={settings.pauseBeforeResults}
                  onChange={e => setSettings(s => ({ ...s, pauseBeforeResults: Number(e.target.value) }))}
                  className="w-24 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">ms</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── Greeting ── */}
        <section>
          <SectionHeading title="Greeting" />
          <AutoResizeTextarea
            value={reactions.greeting}
            onChange={setGreeting}
            placeholder="Opening line spoken when the game starts"
          />
        </section>

        {/* ── Encounters ── */}
        <section>
          <SectionHeading title={`Encounters (${encounters.length})`} />
          <div className="space-y-5">
            {encounters.map((enc, ei) => (
              <div key={enc.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                {/* Card header */}
                <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <select
                    value={enc.tier}
                    onChange={e => setEncounterTier(ei, Number(e.target.value) as 1 | 2 | 3)}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:border-gray-400"
                  >
                    <option value={1}>Tier 1</option>
                    <option value={2}>Tier 2</option>
                    <option value={3}>Tier 3</option>
                  </select>
                  <span className="flex-1 font-mono text-xs text-gray-400">{enc.id}</span>
                  <button
                    onClick={() => removeEncounter(ei)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>

                {/* Narration */}
                <div className="border-b border-gray-100 px-5 py-4">
                  <FieldLabel>Narration</FieldLabel>
                  <AutoResizeTextarea
                    value={enc.narration}
                    onChange={v => setNarration(ei, v)}
                    placeholder="Scene-setting text spoken aloud…"
                  />
                </div>

                {/* Options */}
                <div className="divide-y divide-gray-50">
                  {enc.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-4 shrink-0 text-center text-xs text-gray-400">{oi + 1}</span>
                      <input
                        value={opt.label}
                        onChange={e => setOptionLabel(ei, oi, e.target.value)}
                        placeholder="Option label shown to player"
                        className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-xs text-gray-400">Roll</span>
                        <input
                          type="number"
                          min={2}
                          max={9}
                          value={opt.threshold}
                          onChange={e => setOptionThreshold(ei, oi, Number(e.target.value))}
                          className="w-14 rounded border border-gray-200 px-2 py-2 text-center font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">+</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))}

            <button
              onClick={addEncounter}
              className="w-full rounded-lg border-2 border-dashed border-gray-200 py-4 text-sm text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
            >
              + Add encounter
            </button>
          </div>
        </section>

        {/* ── Pre-roll Lines ── */}
        <section>
          <SectionHeading title={`Pre-roll Lines (${reactions.preRoll.length})`} />
          <p className="mb-3 text-xs text-gray-400">Spoken after the player picks an option, before the dice animation plays.</p>
          <ul className="space-y-2">
            {reactions.preRoll.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <AutoResizeTextarea
                  value={line}
                  onChange={v => setPreRoll(i, v)}
                  placeholder="Short atmospheric line before the roll…"
                />
                <button onClick={() => removePreRoll(i)} className="mt-2.5 shrink-0 text-sm text-red-300 hover:text-red-500">×</button>
              </li>
            ))}
          </ul>
          <button
            onClick={addPreRoll}
            className="mt-3 w-full rounded-lg border-2 border-dashed border-gray-200 py-3 text-sm text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
          >
            + Add line
          </button>
        </section>

        {/* ── Reaction Lines ── */}
        <section>
          <SectionHeading title="Reaction Lines" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

            {/* Affirmative */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <FieldLabel>Affirmative ({reactions.affirmative.length})</FieldLabel>
                <button onClick={addAffirmative} className="text-xs text-gray-400 hover:text-gray-700">+ Add</button>
              </div>
              <ul className="space-y-2">
                {reactions.affirmative.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AutoResizeTextarea
                      value={line}
                      onChange={v => setAffirmative(i, v)}
                      placeholder="Success reaction line…"
                      borderClass="border-green-200 focus:border-green-400"
                    />
                    <button onClick={() => removeAffirmative(i)} className="mt-2.5 shrink-0 text-sm text-red-300 hover:text-red-500">×</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Negative */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <FieldLabel>Negative ({reactions.negative.length})</FieldLabel>
                <button onClick={addNegative} className="text-xs text-gray-400 hover:text-gray-700">+ Add</button>
              </div>
              <ul className="space-y-2">
                {reactions.negative.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AutoResizeTextarea
                      value={line}
                      onChange={v => setNegative(i, v)}
                      placeholder="Failure reaction line…"
                      borderClass="border-red-200 focus:border-red-400"
                    />
                    <button onClick={() => removeNegative(i)} className="mt-2.5 shrink-0 text-sm text-red-300 hover:text-red-500">×</button>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-4 border-b border-gray-200 pb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
      {title}
    </h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{children}</p>
  );
}

function RiveInputRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <FieldLabel>{label}</FieldLabel>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        className="w-48 shrink-0 rounded border border-gray-200 px-3 py-1.5 font-mono text-sm text-gray-800 focus:border-gray-400 focus:outline-none"
      />
    </div>
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  borderClass = 'border-gray-200 focus:border-gray-400',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  borderClass?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden rounded border px-3 py-2 text-sm leading-relaxed text-gray-800 focus:outline-none ${borderClass}`}
    />
  );
}
