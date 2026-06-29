'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { AudioClip, CursorConfig, CursorSlot, DialogueConfig, GradientTheme, Ring, TextureConfig, ThemeKey } from '@/lib/game/settings';

// ─── Types ────────────────────────────────────────────────────────────────────

type Option    = { label: string; threshold: number };
type Encounter = { id: string; tier: 1 | 2 | 3; narration: string; options: [Option, Option, Option] };
type AffirmativePools = { safe: string[]; medium: string[]; risky: string[] };
type Reactions = { greeting: string[]; preRoll: string[]; affirmative: AffirmativePools; negative: string[] };
type RiveConfig = { artboard: string; stateMachine: string; inputScene: string; inputJawOpen: string; inputRoll: string; inputEmotion: string; inputDiceWin: string; inputDiceFail: string };
type Settings   = { cursor: CursorConfig; background: { themes: Record<ThemeKey, GradientTheme> }; rings: Ring[]; texture: TextureConfig; rive: RiveConfig; pageTitle: string; faviconSrc: string; smoothing: number; hoverJaw: { button0: number; button1: number; button2: number; speed: number }; speechSpeed: number; pauseBeforeGreeting: number; pauseBeforePreRoll: number; pauseDiceReveal: number; pauseDiceRoll: number; pauseBeforeResults: number; pauseUiFade: number; dialogueFade: number; contraUrl: string; resultsButtonMinWidth: number; buttonPaddingX: number; buttonPaddingY: number; luck: number; optionButtonMinWidth: number; optionButtonGap: number; layout: { blockOffset: number; blockOffsetMobile: number; rowGap: number; rowGapMobile: number }; buttonMinWidth: number; startScreen: { scale: number; scaleMobile: number }; dialogue: DialogueConfig; riveScale: { scale: number; scaleMobile: number }; audio: { phases: Record<string, AudioClip>; ui: { click: AudioClip } } };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [reactions,  setReactions]  = useState<Reactions>({ greeting: [], preRoll: [], affirmative: { safe: [], medium: [], risky: [] }, negative: [] });
  const [settings,   setSettings]   = useState<Settings>({ cursor: { default: { src: '', hotspotX: 0, hotspotY: 0 }, hover: { src: '', hotspotX: 0, hotspotY: 0 } }, background: { themes: { default: { inner: '#1c1a2e', outer: '#06060a', falloff: 75 }, win: { inner: '#0f2e1a', outer: '#06090a', falloff: 75 }, lose: { inner: '#2e0f10', outer: '#0a0606', falloff: 75 } } }, rings: [{ src: '', opacity: 0.12, scale: 1.0, speed: 40, direction: 'cw' }, { src: '', opacity: 0.08, scale: 1.0, speed: 60, direction: 'ccw' }], rive: { artboard: '', stateMachine: 'Game', inputScene: 'scene', inputJawOpen: 'jawOpen', inputRoll: 'roll', inputEmotion: 'emotion', inputDiceWin: 'dicewin', inputDiceFail: 'dicefail' }, pageTitle: 'Dice Quest', faviconSrc: '', smoothing: 0.95, hoverJaw: { button0: 0.3, button1: 0.6, button2: 0.9, speed: 0.12 }, speechSpeed: 0.7, pauseBeforeGreeting: 500, pauseBeforePreRoll: 0, pauseDiceReveal: 1500, pauseDiceRoll: 2000, pauseBeforeResults: 1000, pauseUiFade: 400, dialogueFade: 300, contraUrl: '', resultsButtonMinWidth: 280, buttonPaddingX: 64, buttonPaddingY: 11, luck: 0, optionButtonMinWidth: 320, optionButtonGap: 1, layout: { blockOffset: 0, blockOffsetMobile: 0, rowGap: 3, rowGapMobile: 2 }, buttonMinWidth: 200, startScreen: { scale: 1.0, scaleMobile: 1.0 }, dialogue: { name: { text: 'SkullGuy', fontSize: 20, opacity: 1 }, body: { fontSize: 18, opacity: 0.7, lineHeight: 1.6 }, divider: { src: '', width: 48, opacity: 0.25 } }, riveScale: { scale: 1.0, scaleMobile: 1.0 }, texture: { src: '', size: 200, opacity: 0.05 }, audio: { phases: {}, ui: { click: { src: '', volume: 1, loop: false } } } });
  const [status,     setStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [tab,        setTab]        = useState<'ui' | 'gameplay'>('ui');
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

  function setGreeting(i: number, v: string) {
    setReactions(prev => { const g = [...prev.greeting]; g[i] = v; return { ...prev, greeting: g }; });
  }
  function addGreeting()         { setReactions(prev => ({ ...prev, greeting: [...prev.greeting, ''] })); }
  function removeGreeting(i: number) {
    setReactions(prev => ({ ...prev, greeting: prev.greeting.filter((_, idx) => idx !== i) }));
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

  function setAffirmative(pool: keyof AffirmativePools, i: number, v: string) {
    setReactions(prev => {
      const a = [...prev.affirmative[pool]]; a[i] = v;
      return { ...prev, affirmative: { ...prev.affirmative, [pool]: a } };
    });
  }

  function setNegative(i: number, v: string) {
    setReactions(prev => {
      const n = [...prev.negative]; n[i] = v;
      return { ...prev, negative: n };
    });
  }

  function addAffirmative(pool: keyof AffirmativePools) {
    setReactions(prev => ({ ...prev, affirmative: { ...prev.affirmative, [pool]: [...prev.affirmative[pool], ''] } }));
  }
  function addNegative() { setReactions(prev => ({ ...prev, negative: [...prev.negative, ''] })); }

  function removeAffirmative(pool: keyof AffirmativePools, i: number) {
    setReactions(prev => ({ ...prev, affirmative: { ...prev.affirmative, [pool]: prev.affirmative[pool].filter((_, idx) => idx !== i) } }));
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
          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
            {(['ui', 'gameplay'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t === 'ui' ? 'UI' : 'Gameplay'}
              </button>
            ))}
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

      {/* ══ UI TAB ══════════════════════════════════════════════════════════ */}
      {tab === 'ui' && <>

        {/* ── Page ── */}
        <section>
          <SectionHeading title="Page" />
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Page title</FieldLabel>
                <p className="text-xs text-gray-400">Shown in the browser tab.</p>
              </div>
              <input
                type="text"
                value={settings.pageTitle}
                onChange={e => setSettings(s => ({ ...s, pageTitle: e.target.value }))}
                className="ml-6 w-56 rounded border border-gray-200 px-2 py-1.5 font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Favicon</FieldLabel>
                <p className="text-xs text-gray-400">ICO, PNG, SVG or WebP.</p>
                {settings.faviconSrc && <p className="mt-0.5 font-mono text-xs text-gray-400">{settings.faviconSrc.split('/').pop()}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-6">
                {settings.faviconSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.faviconSrc} alt="favicon preview" className="h-6 w-6 object-contain" />
                )}
                <input
                  id="favicon-file-input"
                  type="file"
                  accept=".ico,.png,.svg,.webp,image/x-icon,image/png,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('file', file);
                    const res = await fetch('/api/admin/upload-favicon', { method: 'POST', body: fd });
                    if (res.ok) {
                      const { src } = await res.json() as { src: string };
                      setSettings(s => ({ ...s, faviconSrc: src }));
                    }
                  }}
                />
                <button
                  onClick={() => document.getElementById('favicon-file-input')?.click()}
                  className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  {settings.faviconSrc ? 'Replace' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Background ── */}
        <section>
          <SectionHeading title="Background" />

          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Gradient themes</h3>
          <p className="mb-3 text-xs text-gray-400">
            Three radial gradient presets. The game crossfades between them during win/lose moments.
          </p>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(['default', 'win', 'lose'] as ThemeKey[]).map(key => (
              <GradientThemeCard
                key={key}
                themeKey={key}
                theme={settings.background.themes[key]}
                onChange={updated => setSettings(s => ({
                  ...s,
                  background: { themes: { ...s.background.themes, [key]: updated } },
                }))}
              />
            ))}
          </div>

          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Rings</h3>
          <p className="mb-3 text-xs text-gray-400">
            Two concentric ring layers rendered behind the game. Upload an SVG texture for each. Changes take effect after saving and reloading.
          </p>
          <div className="mb-8 space-y-4">
            {settings.rings.map((ring, i) => (
              <RingCard
                key={i}
                index={i}
                ring={ring}
                onChange={updated => setSettings(s => ({
                  ...s,
                  rings: s.rings.map((r, idx) => idx === i ? updated : r),
                }))}
              />
            ))}
          </div>

          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Texture overlay</h3>
          <p className="mb-3 text-xs text-gray-400">
            Tileable SVG grain or noise layer rendered above the gradient and rings.
          </p>
          <TextureCard
            texture={settings.texture}
            onChange={updated => setSettings(s => ({ ...s, texture: updated }))}
          />
        </section>

        {/* ── Cursor ── */}
        <section>
          <SectionHeading title="Cursor" />
          <div className="space-y-4">
            {(['default', 'hover'] as const).map(slot => (
              <CursorSlotCard
                key={slot}
                slot={slot}
                cursor={settings.cursor[slot]}
                onChange={updated => setSettings(s => ({ ...s, cursor: { ...s.cursor, [slot]: updated } }))}
              />
            ))}
          </div>
        </section>

        {/* ── Layout ── */}
        <section>
          <SectionHeading title="Layout" />
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">

            {/* Block offset */}
            <div className="px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Block offset from centre (% vh)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel>Desktop</FieldLabel>
                    <span className="font-mono text-xs text-gray-500">{settings.layout.blockOffset > 0 ? '+' : ''}{settings.layout.blockOffset}%</span>
                  </div>
                  <input type="range" min={-30} max={30} step={1}
                    value={settings.layout.blockOffset}
                    onChange={e => setSettings(s => ({ ...s, layout: { ...s.layout, blockOffset: Number(e.target.value) } }))}
                    className="w-full accent-gray-700" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel>Mobile</FieldLabel>
                    <span className="font-mono text-xs text-gray-500">{settings.layout.blockOffsetMobile > 0 ? '+' : ''}{settings.layout.blockOffsetMobile}%</span>
                  </div>
                  <input type="range" min={-30} max={30} step={1}
                    value={settings.layout.blockOffsetMobile}
                    onChange={e => setSettings(s => ({ ...s, layout: { ...s.layout, blockOffsetMobile: Number(e.target.value) } }))}
                    className="w-full accent-gray-700" />
                </div>
              </div>
            </div>

            {/* Row gap */}
            <div className="px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Gap between rows (% vh)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel>Desktop</FieldLabel>
                    <span className="font-mono text-xs text-gray-500">{settings.layout.rowGap}%</span>
                  </div>
                  <input type="range" min={0} max={15} step={0.5}
                    value={settings.layout.rowGap}
                    onChange={e => setSettings(s => ({ ...s, layout: { ...s.layout, rowGap: Number(e.target.value) } }))}
                    className="w-full accent-gray-700" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel>Mobile</FieldLabel>
                    <span className="font-mono text-xs text-gray-500">{settings.layout.rowGapMobile}%</span>
                  </div>
                  <input type="range" min={0} max={15} step={0.5}
                    value={settings.layout.rowGapMobile}
                    onChange={e => setSettings(s => ({ ...s, layout: { ...s.layout, rowGapMobile: Number(e.target.value) } }))}
                    className="w-full accent-gray-700" />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Buttons ── */}
        <section>
          <SectionHeading title="Buttons" />
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Min width</FieldLabel>
                <p className="text-xs text-gray-400">Minimum width of every hex button in px.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={80} max={600} step={4}
                  value={settings.buttonMinWidth}
                  onChange={e => setSettings(s => ({ ...s, buttonMinWidth: Number(e.target.value) }))}
                  className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">px</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Horizontal padding</FieldLabel>
                <p className="text-xs text-gray-400">Left/right padding inside every button.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} max={200} step={2}
                  value={settings.buttonPaddingX}
                  onChange={e => setSettings(s => ({ ...s, buttonPaddingX: Number(e.target.value) }))}
                  className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">px</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Vertical padding</FieldLabel>
                <p className="text-xs text-gray-400">Top/bottom padding inside every button.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} max={80} step={1}
                  value={settings.buttonPaddingY}
                  onChange={e => setSettings(s => ({ ...s, buttonPaddingY: Number(e.target.value) }))}
                  className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">px</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Option button min width</FieldLabel>
                <p className="text-xs text-gray-400">Minimum width of the multiple choice answer buttons.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={80} max={800} step={4}
                  value={settings.optionButtonMinWidth}
                  onChange={e => setSettings(s => ({ ...s, optionButtonMinWidth: Number(e.target.value) }))}
                  className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">px</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Option button gap</FieldLabel>
                <p className="text-xs text-gray-400">Spacing between multiple choice buttons (% vh).</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} max={10} step={0.25}
                  value={settings.optionButtonGap}
                  onChange={e => setSettings(s => ({ ...s, optionButtonGap: Number(e.target.value) }))}
                  className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">vh</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Results button min width</FieldLabel>
                <p className="text-xs text-gray-400">Minimum width of the Play Again and View on Contra buttons.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={80} max={600} step={4}
                  value={settings.resultsButtonMinWidth}
                  onChange={e => setSettings(s => ({ ...s, resultsButtonMinWidth: Number(e.target.value) }))}
                  className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">px</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Rive Canvas ── */}
        <section>
          <SectionHeading title="Rive Canvas" />
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <FieldLabel>Desktop scale</FieldLabel>
                  <p className="text-xs text-gray-400">Base size is 480px × scale.</p>
                </div>
                <span className="font-mono text-xs text-gray-500 shrink-0 ml-6">{settings.riveScale.scale.toFixed(2)}×</span>
              </div>
              <input
                type="range" min={0.3} max={2} step={0.01}
                value={settings.riveScale.scale}
                onChange={e => setSettings(s => ({ ...s, riveScale: { ...s.riveScale, scale: Number(e.target.value) } }))}
                className="w-full accent-gray-700"
              />
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <FieldLabel>Mobile scale</FieldLabel>
                  <p className="text-xs text-gray-400">Applied on screens narrower than 768px.</p>
                </div>
                <span className="font-mono text-xs text-gray-500 shrink-0 ml-6">{settings.riveScale.scaleMobile.toFixed(2)}×</span>
              </div>
              <input
                type="range" min={0.3} max={2} step={0.01}
                value={settings.riveScale.scaleMobile}
                onChange={e => setSettings(s => ({ ...s, riveScale: { ...s.riveScale, scaleMobile: Number(e.target.value) } }))}
                className="w-full accent-gray-700"
              />
            </div>
          </div>
        </section>

        {/* ── Option Hover Jaw ── */}
        <section>
          <SectionHeading title="Option Hover Jaw" />
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {(['button0', 'button1', 'button2'] as const).map((key, i) => (
              <div key={key} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <FieldLabel>Button {i + 1} jaw open</FieldLabel>
                    <p className="text-xs text-gray-400">Jaw open value (0–1) when hovering option {i + 1}.</p>
                  </div>
                  <span className="font-mono text-xs text-gray-500 shrink-0 ml-6">{settings.hoverJaw[key].toFixed(2)}</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={settings.hoverJaw[key]}
                  onChange={e => setSettings(s => ({ ...s, hoverJaw: { ...s.hoverJaw, [key]: Number(e.target.value) } }))}
                  className="w-full accent-gray-700"
                />
              </div>
            ))}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <FieldLabel>Transition speed</FieldLabel>
                  <p className="text-xs text-gray-400">Interpolation speed per frame. Higher = faster (0.01–0.5).</p>
                </div>
                <span className="font-mono text-xs text-gray-500 shrink-0 ml-6">{settings.hoverJaw.speed.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0.01} max={0.5} step={0.01}
                value={settings.hoverJaw.speed}
                onChange={e => setSettings(s => ({ ...s, hoverJaw: { ...s.hoverJaw, speed: Number(e.target.value) } }))}
                className="w-full accent-gray-700"
              />
            </div>
          </div>
        </section>

        {/* ── Start Screen ── */}
        <section>
          <SectionHeading title="Start Screen" />
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <FieldLabel>Logo + button scale</FieldLabel>
                  <p className="text-xs text-gray-400">Scales the logo and Enter button as a single block.</p>
                </div>
                <span className="font-mono text-xs text-gray-500 shrink-0 ml-6">{settings.startScreen.scale.toFixed(2)}×</span>
              </div>
              <input
                type="range" min={0.5} max={2} step={0.01}
                value={settings.startScreen.scale}
                onChange={e => setSettings(s => ({ ...s, startScreen: { ...s.startScreen, scale: Number(e.target.value) } }))}
                className="w-full accent-gray-700"
              />
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <FieldLabel>Mobile scale</FieldLabel>
                  <p className="text-xs text-gray-400">Applied on screens narrower than 768px.</p>
                </div>
                <span className="font-mono text-xs text-gray-500 shrink-0 ml-6">{(settings.startScreen.scaleMobile ?? 1).toFixed(2)}×</span>
              </div>
              <input
                type="range" min={0.5} max={2} step={0.01}
                value={settings.startScreen.scaleMobile ?? 1}
                onChange={e => setSettings(s => ({ ...s, startScreen: { ...s.startScreen, scaleMobile: Number(e.target.value) } }))}
                className="w-full accent-gray-700"
              />
            </div>
          </div>
        </section>

        {/* ── Dialogue UI ── */}
        <section>
          <SectionHeading title="Dialogue UI" />
          <DialogueUICard
            dialogue={settings.dialogue}
            onChange={d => setSettings(s => ({ ...s, dialogue: d }))}
          />
        </section>

        {/* ── Results Screen ── */}
        <section>
          <SectionHeading title="Results Screen" />
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Contra URL</FieldLabel>
                <p className="text-xs text-gray-400">&quot;View on Contra&quot; button — leave blank to hide it.</p>
              </div>
              <input
                type="url"
                value={settings.contraUrl}
                onChange={e => setSettings(s => ({ ...s, contraUrl: e.target.value }))}
                placeholder="https://contra.com/…"
                className="ml-6 w-64 rounded border border-gray-200 px-2 py-1.5 font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* ── UI Sounds ── */}
        <section>
          <SectionHeading title="UI Sounds" />
          <AudioPhaseCard
            phaseKey="ui-click"
            label="Button click"
            note="Plays on every HexButton press"
            clip={settings.audio.ui?.click ?? { src: '', volume: 1.0, loop: false }}
            onChange={clip => setSettings(s => ({ ...s, audio: { ...s.audio, ui: { ...s.audio.ui, click: clip } } }))}
          />
        </section>

      </>}

      {/* ══ GAMEPLAY TAB ════════════════════════════════════════════════════ */}
      {tab === 'gameplay' && <>

        {/* ── Rive Inputs ── */}
        <section>
          <SectionHeading title="Rive Inputs" />
          <p className="mb-3 text-xs text-gray-400">
            These must match the names in your <span className="font-mono">SkullRive.riv</span> file exactly.
            A mismatch causes silent failure — the input simply won&apos;t respond.
          </p>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">

            <RiveInputRow
              label="Artboard name"
              description="The artboard to load from the .riv file"
              value={settings.rive.artboard}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, artboard: v } }))}
            />

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
              description="Number input (0–1) on the Game SM driving the jaw Blend 1D state"
              value={settings.rive.inputJawOpen}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, inputJawOpen: v } }))}
            />

            <RiveInputRow
              label="Roll input"
              description="Number input (1–8) on the Game SM selecting the dice face shown during resolving"
              value={settings.rive.inputRoll}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, inputRoll: v } }))}
            />

            <RiveInputRow
              label="Emotion input"
              description="Number input on the Game SM — 0=idle · 1=win · 2=lose"
              value={settings.rive.inputEmotion}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, inputEmotion: v } }))}
            />

            <RiveInputRow
              label="Dice win trigger"
              description="Trigger input on the Game SM — fired once when a winning roll is revealed"
              value={settings.rive.inputDiceWin}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, inputDiceWin: v } }))}
            />

            <RiveInputRow
              label="Dice fail trigger"
              description="Trigger input on the Game SM — fired once when a failing roll is revealed"
              value={settings.rive.inputDiceFail}
              onChange={v => setSettings(s => ({ ...s, rive: { ...s.rive, inputDiceFail: v } }))}
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

            {/* Luck */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>Luck bonus</FieldLabel>
                <span className="font-mono text-xs text-gray-500">{settings.luck}</span>
              </div>
              <input
                type="range" min={0} max={4} step={0.5}
                value={settings.luck}
                onChange={e => setSettings(s => ({ ...s, luck: Number(e.target.value) }))}
                className="w-full accent-gray-700"
              />
              <details className="mt-3 rounded-lg border border-gray-100 bg-gray-50 text-xs text-gray-600 open:pb-1">
                <summary className="cursor-pointer select-none list-none px-3 py-2 font-medium text-gray-700 hover:text-gray-900 [&::-webkit-details-marker]:hidden after:content-['_↓'] open:after:content-['_↑']">
                  How luck works
                </summary>
                <div className="px-3 pb-3 pt-1 space-y-2.5">
                  <p>Each encounter the player faces is assigned an index starting at 0. A <strong>luck bonus</strong> is added to the raw d8 roll (capped at 8) for the first three encounters only, then drops to zero.</p>
                  <p className="font-mono text-gray-500">bonus = round(luck × max(0, 1 − index / 3))</p>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-1 text-left font-medium text-gray-500">Encounter</th>
                        <th className="py-1 font-medium text-gray-500">Multiplier</th>
                        <th className="py-1 font-medium text-gray-500">+Bonus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3].map(idx => {
                        const mult = idx >= 3 ? 0 : 1 - idx / 3;
                        const bonus = Math.round(settings.luck * mult);
                        return (
                          <tr key={idx} className="border-b border-gray-100 last:border-0">
                            <td className="py-1 text-left text-gray-500">{idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : '4th+'}</td>
                            <td className="py-1 text-gray-500">{(mult * 100).toFixed(0)}%</td>
                            <td className={`py-1 font-semibold ${bonus > 0 ? 'text-green-600' : 'text-gray-400'}`}>+{bonus}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="text-gray-400">The bonus is added before comparing against the threshold, so a +2 on a 1d8 roll of 5 becomes 7. The result is capped at 8.</p>
                </div>
              </details>
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

            {/* UI fade duration */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>UI fade duration</FieldLabel>
                <p className="text-xs text-gray-400">How long the start screen takes to fade out after &ldquo;Begin your journey&rdquo; is clicked.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} step={50}
                  value={settings.pauseUiFade}
                  onChange={e => setSettings(s => ({ ...s, pauseUiFade: Number(e.target.value) }))}
                  className="w-24 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">ms</span>
              </div>
            </div>

            {/* Dialogue fade duration */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <FieldLabel>Dialogue fade duration</FieldLabel>
                <p className="text-xs text-gray-400">How long the dialogue panel takes to fade in and out between narration and choices.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-6">
                <input
                  type="number" min={0} step={50}
                  value={settings.dialogueFade}
                  onChange={e => setSettings(s => ({ ...s, dialogueFade: Number(e.target.value) }))}
                  className="w-24 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">ms</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── Game Timeline ── */}
        <section>
          <SectionHeading title="Game Timeline" />
          <GameTimeline settings={settings} setSettings={setSettings} />
        </section>

        {/* ── Audio ── */}
        <section>
          <SectionHeading title="Audio" />
          <p className="mb-3 text-xs text-gray-400">One clip per game phase — plays on phase enter, stops on phase change.</p>
          <div className="space-y-3">
            {AUDIO_PHASES.map(({ key, label, note }) => (
              <AudioPhaseCard
                key={key}
                phaseKey={key}
                label={label}
                note={note}
                clip={settings.audio.phases[key] ?? { src: '', volume: 1.0, loop: true }}
                onChange={clip => setSettings(s => ({ ...s, audio: { ...s.audio, phases: { ...s.audio.phases, [key]: clip } } }))}
              />
            ))}
          </div>
        </section>

        {/* ── Greeting ── */}
        <section>
          <SectionHeading title="Greeting" />
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">One line is picked at random each run.</p>
            <button onClick={addGreeting} className="text-xs text-gray-400 hover:text-gray-700">+ Add</button>
          </div>
          <ul className="space-y-2">
            {reactions.greeting.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <AutoResizeTextarea
                  value={line}
                  onChange={v => setGreeting(i, v)}
                  placeholder="Opening line…"
                />
                <button onClick={() => removeGreeting(i)} className="mt-2.5 shrink-0 text-sm text-red-300 hover:text-red-500">×</button>
              </li>
            ))}
          </ul>
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

          {/* Affirmative — three pools by choice risk */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Affirmative — by choice</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {([ ['safe', 'Choice 1 — Safe', 'border-green-200 focus:border-green-400'],
                  ['medium', 'Choice 2 — Medium', 'border-yellow-200 focus:border-yellow-400'],
                  ['risky', 'Choice 3 — Risky', 'border-orange-200 focus:border-orange-400'],
              ] as const).map(([pool, label, borderClass]) => (
                <div key={pool} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <FieldLabel>{label} ({reactions.affirmative[pool].length})</FieldLabel>
                    <button onClick={() => addAffirmative(pool)} className="text-xs text-gray-400 hover:text-gray-700">+ Add</button>
                  </div>
                  <ul className="space-y-2">
                    {reactions.affirmative[pool].map((line, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AutoResizeTextarea
                          value={line}
                          onChange={v => setAffirmative(pool, i, v)}
                          placeholder="Success line…"
                          borderClass={borderClass}
                        />
                        <button onClick={() => removeAffirmative(pool, i)} className="mt-2.5 shrink-0 text-sm text-red-300 hover:text-red-500">×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

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

      </>}

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

function CursorSlotCard({
  slot,
  cursor,
  onChange,
}: {
  slot: 'default' | 'hover';
  cursor: CursorSlot;
  onChange: (c: CursorSlot) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadErr('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', slot);
    const res = await fetch('/api/admin/upload-cursor', { method: 'POST', body: fd });
    if (res.ok) {
      const { src } = await res.json() as { src: string };
      onChange({ ...cursor, src });
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setUploadErr(body.error ?? 'Upload failed');
    }
    setUploading(false);
  }

  const label    = slot === 'default' ? 'Default cursor' : 'Hover cursor';
  const hint     = slot === 'default' ? 'Shown everywhere.' : 'Shown over buttons, links, and interactive elements.';
  const filename = cursor.src ? cursor.src.split('/').pop() : null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">

      <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</span>
        {filename && <span className="font-mono text-xs text-gray-400">{filename}</span>}
      </div>

      {/* Upload */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <FieldLabel>Image</FieldLabel>
          <p className="text-xs text-gray-400">{hint} PNG, SVG, WebP or CUR.</p>
          {uploadErr && <p className="mt-1 text-xs text-red-500">{uploadErr}</p>}
        </div>
        <div className="shrink-0 ml-6">
          <input
            ref={fileRef}
            type="file"
            accept=".svg,.png,.webp,.cur,image/svg+xml,image/png,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading…' : cursor.src ? 'Replace' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Hotspot */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <FieldLabel>Hotspot</FieldLabel>
          <p className="text-xs text-gray-400">Active click point in pixels.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-6">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">X</span>
            <input
              type="number" min={0} step={1}
              value={cursor.hotspotX}
              onChange={e => onChange({ ...cursor, hotspotX: Number(e.target.value) })}
              className="w-16 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Y</span>
            <input
              type="number" min={0} step={1}
              value={cursor.hotspotY}
              onChange={e => onChange({ ...cursor, hotspotY: Number(e.target.value) })}
              className="w-16 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-gray-200 p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
          className="w-20 rounded border border-gray-200 px-2 py-1 font-mono text-xs uppercase text-gray-700 focus:border-gray-400 focus:outline-none"
        />
      </div>
    </div>
  );
}

function GradientThemeCard({
  themeKey,
  theme,
  onChange,
}: {
  themeKey: ThemeKey;
  theme: GradientTheme;
  onChange: (t: GradientTheme) => void;
}) {
  const label   = { default: 'Default', win: 'Win', lose: 'Lose' }[themeKey];
  const border  = { default: 'border-gray-200', win: 'border-green-200', lose: 'border-red-200' }[themeKey];

  return (
    <div className={`overflow-hidden rounded-lg border ${border} bg-white divide-y divide-gray-100`}>

      {/* Header + preview swatch */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</span>
        <div
          className="h-4 w-16 rounded"
          style={{ background: `radial-gradient(circle at center, ${theme.inner} 0%, ${theme.outer} ${theme.falloff}%)` }}
        />
      </div>

      <ColorRow label="Inner" value={theme.inner} onChange={v => onChange({ ...theme, inner: v })} />
      <ColorRow label="Outer" value={theme.outer} onChange={v => onChange({ ...theme, outer: v })} />

      {/* Falloff */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Falloff</FieldLabel>
          <span className="font-mono text-xs text-gray-500">{theme.falloff}%</span>
        </div>
        <input
          type="range" min={10} max={150} step={1}
          value={theme.falloff}
          onChange={e => onChange({ ...theme, falloff: Number(e.target.value) })}
          className="w-full accent-gray-700"
        />
        <p className="mt-1 text-xs text-gray-400">100% = full edge. Lower = tighter spotlight.</p>
      </div>

    </div>
  );
}

function RingCard({
  index,
  ring,
  onChange,
}: {
  index: number;
  ring: Ring;
  onChange: (r: Ring) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith('.svg')) {
      setUploadErr('SVG files only');
      return;
    }
    setUploading(true);
    setUploadErr('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', String(index + 1));
    const res = await fetch('/api/admin/upload-texture', { method: 'POST', body: fd });
    if (res.ok) {
      const { src } = await res.json() as { src: string };
      onChange({ ...ring, src });
    } else {
      setUploadErr('Upload failed');
    }
    setUploading(false);
  }

  const filename = ring.src ? ring.src.split('/').pop() : null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">

      <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Ring {index + 1}</span>
        {filename && <span className="font-mono text-xs text-gray-400">{filename}</span>}
      </div>

      {/* Upload */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <FieldLabel>SVG texture</FieldLabel>
          <p className="text-xs text-gray-400">Saved to <span className="font-mono">public/ring{index + 1}.svg</span></p>
          {uploadErr && <p className="mt-1 text-xs text-red-500">{uploadErr}</p>}
        </div>
        <div className="shrink-0 ml-6">
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading…' : ring.src ? 'Replace SVG' : 'Upload SVG'}
          </button>
        </div>
      </div>

      {/* Opacity */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Opacity</FieldLabel>
          <span className="font-mono text-xs text-gray-500">{ring.opacity.toFixed(2)}</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.01}
          value={ring.opacity}
          onChange={e => onChange({ ...ring, opacity: Number(e.target.value) })}
          className="w-full accent-gray-700"
        />
      </div>

      {/* Scale */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <FieldLabel>Scale</FieldLabel>
          <p className="text-xs text-gray-400">Multiplier on the base 120vmax size. 1.0 = fills viewport.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-6">
          <input
            type="number" min={0.1} step={0.05}
            value={ring.scale}
            onChange={e => onChange({ ...ring, scale: Number(e.target.value) })}
            className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          />
          <span className="text-xs text-gray-400">×</span>
        </div>
      </div>

      {/* Speed */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <FieldLabel>Rotation speed</FieldLabel>
          <p className="text-xs text-gray-400">Seconds per full rotation — higher is slower.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-6">
          <input
            type="number" min={1} step={5}
            value={ring.speed}
            onChange={e => onChange({ ...ring, speed: Number(e.target.value) })}
            className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          />
          <span className="text-xs text-gray-400">s / rev</span>
        </div>
      </div>

      {/* Direction */}
      <div className="flex items-center justify-between px-5 py-4">
        <FieldLabel>Direction</FieldLabel>
        <div className="flex overflow-hidden rounded border border-gray-200">
          {(['cw', 'ccw'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => onChange({ ...ring, direction: dir })}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                ring.direction === dir
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {dir === 'cw' ? '↻ CW' : '↺ CCW'}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

function TLEvent({
  label,
  sub,
  trailing,
}: {
  label: string;
  sub?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="relative z-10 mt-[5px] h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-700 bg-white" />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-gray-800">{label}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    </div>
  );
}

function TLPause({
  label,
  value,
  maxMs,
  input,
  variable,
  derived,
  accent = 'indigo',
}: {
  label: string;
  value?: number;
  maxMs: number;
  input?: React.ReactNode;
  variable?: boolean;
  derived?: boolean;
  accent?: 'indigo' | 'amber';
}) {
  const pct = variable ? 22 : Math.max(2, Math.round(((value ?? 0) / maxMs) * 100));
  const barColor =
    variable || derived ? 'bg-gray-300' :
    accent === 'amber'  ? 'bg-amber-400' : 'bg-indigo-400';

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex w-3.5 shrink-0 flex-col items-center">
        <div className="w-px flex-1 bg-gray-200" />
      </div>
      <div className="flex-1 py-2">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className="text-xs leading-snug text-gray-500">{label}</span>
          {input ? (
            <div className="shrink-0">{input}</div>
          ) : variable ? (
            <span className="text-xs italic text-gray-400">variable</span>
          ) : derived ? (
            <span className="font-mono text-xs text-gray-400">{value} ms</span>
          ) : null}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-[width] duration-150 ${barColor} ${variable ? 'opacity-40' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function GameTimeline({
  settings,
  setSettings,
}: {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
}) {
  const maxMs = Math.max(settings.pauseDiceRoll, 1);
  const remaining = Math.max(0, settings.pauseDiceRoll - settings.pauseDiceReveal);

  function num(key: keyof Settings, step = 100) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          step={step}
          value={settings[key] as number}
          onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
          className="w-20 rounded border border-gray-200 px-2 py-0.5 text-right font-mono text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
        />
        <span className="text-xs text-gray-400">ms</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-6 py-5">
      <p className="mb-5 text-xs text-gray-400">
        Bars are proportional to <span className="font-mono">pauseDiceRoll</span> ({maxMs} ms — the longest fixed interval).
        Dashed grey segments depend on ElevenLabs speech length.
      </p>
      <div className="relative">
        <div className="absolute bottom-3 left-[6px] top-3 w-px bg-gray-200" />

        <TLEvent label="Page loads" sub="Rive intro scene begins playing immediately" />
        <TLPause label="Intro plays" maxMs={maxMs} variable />

        <TLEvent label='"Enter" clicked' />
        <TLPause label="pauseUiFade — start screen fades out" value={settings.pauseUiFade} maxMs={maxMs} input={num('pauseUiFade', 50)} />

        <TLEvent label="Name entry screen shown" sub="Player types name and clicks Save" />
        <TLPause label="Player input — variable duration" maxMs={maxMs} variable />

        <TLEvent label="Name saved" />
        <TLPause label="pauseBeforeGreeting — countdown before greeting" value={settings.pauseBeforeGreeting} maxMs={maxMs} input={num('pauseBeforeGreeting')} />

        <TLEvent label="Greeting speech begins" sub="ElevenLabs TTS — variable duration, includes [player] name" />
        <TLPause label="Greeting speech" maxMs={maxMs} variable />

        <TLEvent label="First encounter presented" sub="User picks an option" />
        <TLPause label="Pre-roll speech" maxMs={maxMs} variable />

        <TLEvent label="Player clicks option" />
        <TLPause label="pauseBeforePreRoll — delay before pre-roll speech begins" value={settings.pauseBeforePreRoll} maxMs={maxMs} input={num('pauseBeforePreRoll')} />

        <TLEvent label="Dice roll begins" />
        <TLPause label="pauseDiceReveal — result revealed + dicewin / dicefail fires" value={settings.pauseDiceReveal} maxMs={maxMs} input={num('pauseDiceReveal')} accent="amber" />

        <TLEvent label="Roll result shown" />
        <TLPause label={`Remaining animation (pauseDiceRoll − pauseDiceReveal = ${remaining} ms)`} value={remaining} maxMs={maxMs} derived />

        <TLEvent
          label="Dice animation ends · reaction speech begins"
          sub="pauseDiceRoll (total dice phase):"
          trailing={num('pauseDiceRoll')}
        />
        <TLPause label="Reaction speech" maxMs={maxMs} variable />

        <TLEvent label="Reaction ends · next encounter or final" sub="pauseBeforeResults applies only after the last encounter" />
        <TLPause label="pauseBeforeResults — before results screen" value={settings.pauseBeforeResults} maxMs={maxMs} input={num('pauseBeforeResults')} />

        <TLEvent label="Results screen" />
      </div>
    </div>
  );
}

function TextureCard({ texture, onChange }: { texture: TextureConfig; onChange: (t: TextureConfig) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadErr('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload-bg-texture', { method: 'POST', body: fd });
    if (res.ok) {
      const { src } = await res.json() as { src: string };
      onChange({ ...texture, src });
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setUploadErr(body.error ?? 'Upload failed');
    }
    setUploading(false);
  }

  const filename = texture.src ? texture.src.split('/').pop() : null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">

      {/* Upload */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <FieldLabel>SVG texture</FieldLabel>
          <p className="text-xs text-gray-400">Tileable SVG. Saved to <span className="font-mono">public/bg-texture.svg</span></p>
          {filename && <p className="mt-0.5 font-mono text-xs text-gray-500">{filename}</p>}
          {uploadErr && <p className="mt-1 text-xs text-red-500">{uploadErr}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-6">
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading…' : texture.src ? 'Replace' : 'Upload'}
          </button>
          {texture.src && (
            <button
              onClick={() => onChange({ ...texture, src: '' })}
              className="rounded border border-red-100 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Tile size + opacity */}
      <div className="flex flex-wrap items-center gap-6 px-5 py-4">
        <div className="flex items-center gap-2">
          <FieldLabel>Tile size</FieldLabel>
          <input
            type="number" min={1} step={1}
            value={texture.size}
            onChange={e => onChange({ ...texture, size: Number(e.target.value) })}
            className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          />
          <span className="text-xs text-gray-400">px</span>
        </div>
        <div className="flex items-center gap-2">
          <FieldLabel>Opacity</FieldLabel>
          <input
            type="range" min={0} max={1} step={0.01}
            value={texture.opacity}
            onChange={e => onChange({ ...texture, opacity: Number(e.target.value) })}
            className="w-24 accent-gray-700"
          />
          <span className="w-8 text-right font-mono text-xs text-gray-500">{texture.opacity.toFixed(2)}</span>
        </div>
      </div>

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

// ── Dialogue UI ───────────────────────────────────────────────────────────

function DialogueUICard({ dialogue, onChange }: { dialogue: DialogueConfig; onChange: (d: DialogueConfig) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadErr('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload-dialogue-divider', { method: 'POST', body: fd });
    if (res.ok) {
      const { src } = await res.json() as { src: string };
      onChange({ ...dialogue, divider: { ...dialogue.divider, src } });
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setUploadErr(body.error ?? 'Upload failed');
    }
    setUploading(false);
  }

  const divFilename = dialogue.divider.src ? dialogue.divider.src.split('/').pop() : null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">

      {/* Name */}
      <div className="bg-gray-50 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Name</span>
      </div>

      <div className="flex items-center justify-between px-5 py-4">
        <FieldLabel>Text</FieldLabel>
        <input
          value={dialogue.name.text}
          onChange={e => onChange({ ...dialogue, name: { ...dialogue.name, text: e.target.value } })}
          spellCheck={false}
          className="w-48 rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-gray-400 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-6 px-5 py-4">
        <div className="flex items-center gap-2">
          <FieldLabel>Size</FieldLabel>
          <input
            type="number" min={10} max={72} step={1}
            value={dialogue.name.fontSize}
            onChange={e => onChange({ ...dialogue, name: { ...dialogue.name, fontSize: Number(e.target.value) } })}
            className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          />
          <span className="text-xs text-gray-400">px</span>
        </div>
        <div className="flex items-center gap-2">
          <FieldLabel>Opacity</FieldLabel>
          <input
            type="range" min={0} max={1} step={0.01}
            value={dialogue.name.opacity}
            onChange={e => onChange({ ...dialogue, name: { ...dialogue.name, opacity: Number(e.target.value) } })}
            className="w-24 accent-gray-700"
          />
          <span className="w-8 text-right font-mono text-xs text-gray-500">{dialogue.name.opacity.toFixed(2)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="bg-gray-50 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Divider</span>
      </div>

      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <FieldLabel>Image</FieldLabel>
          <p className="text-xs text-gray-400">PNG, SVG, WebP, JPG.</p>
          {divFilename && <p className="mt-0.5 font-mono text-xs text-gray-500">{divFilename}</p>}
          {uploadErr && <p className="mt-1 text-xs text-red-500">{uploadErr}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-6">
          <input ref={fileRef} type="file" accept=".png,.svg,.webp,.jpg,.jpeg,image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {uploading ? 'Uploading…' : dialogue.divider.src ? 'Replace' : 'Upload'}
          </button>
          {dialogue.divider.src && (
            <button onClick={() => onChange({ ...dialogue, divider: { ...dialogue.divider, src: '' } })}
              className="rounded border border-red-100 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 px-5 py-4">
        <div className="flex items-center gap-2">
          <FieldLabel>Width</FieldLabel>
          <input
            type="number" min={4} max={400} step={2}
            value={dialogue.divider.width}
            onChange={e => onChange({ ...dialogue, divider: { ...dialogue.divider, width: Number(e.target.value) } })}
            className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          />
          <span className="text-xs text-gray-400">px</span>
        </div>
        <div className="flex items-center gap-2">
          <FieldLabel>Opacity</FieldLabel>
          <input
            type="range" min={0} max={1} step={0.01}
            value={dialogue.divider.opacity}
            onChange={e => onChange({ ...dialogue, divider: { ...dialogue.divider, opacity: Number(e.target.value) } })}
            className="w-24 accent-gray-700"
          />
          <span className="w-8 text-right font-mono text-xs text-gray-500">{dialogue.divider.opacity.toFixed(2)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="bg-gray-50 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Dialogue</span>
      </div>

      <div className="flex flex-wrap items-center gap-6 px-5 py-4">
        <div className="flex items-center gap-2">
          <FieldLabel>Size</FieldLabel>
          <input
            type="number" min={10} max={48} step={1}
            value={dialogue.body.fontSize}
            onChange={e => onChange({ ...dialogue, body: { ...dialogue.body, fontSize: Number(e.target.value) } })}
            className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          />
          <span className="text-xs text-gray-400">px</span>
        </div>
        <div className="flex items-center gap-2">
          <FieldLabel>Line height</FieldLabel>
          <input
            type="number" min={0.8} max={3} step={0.05}
            value={dialogue.body.lineHeight}
            onChange={e => onChange({ ...dialogue, body: { ...dialogue.body, lineHeight: Number(e.target.value) } })}
            className="w-20 rounded border border-gray-200 px-2 py-1.5 text-right font-mono text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <FieldLabel>Opacity</FieldLabel>
          <input
            type="range" min={0} max={1} step={0.01}
            value={dialogue.body.opacity}
            onChange={e => onChange({ ...dialogue, body: { ...dialogue.body, opacity: Number(e.target.value) } })}
            className="w-24 accent-gray-700"
          />
          <span className="w-8 text-right font-mono text-xs text-gray-500">{dialogue.body.opacity.toFixed(2)}</span>
        </div>
      </div>

    </div>
  );
}

// ── Audio ──────────────────────────────────────────────────────────────────

const AUDIO_PHASES = [
  { key: 'start',       label: 'Page loads',          note: 'Intro scene — plays after reload (requires AudioContext)' },
  { key: 'greeting',    label: 'Greeting speech',      note: 'After "Begin Journey" + pauseBeforeGreeting' },
  { key: 'presenting',  label: 'Encounter presented',  note: 'While player reads and picks an option' },
  { key: 'pre-rolling', label: 'Pre-roll speech',      note: 'Before dice animation starts' },
  { key: 'resolving',   label: 'Dice roll',            note: 'pauseDiceReveal → pauseDiceRoll' },
  { key: 'reacting',    label: 'Reaction',             note: 'Win or lose reaction speech' },
  { key: 'results',     label: 'Results screen',       note: 'End of run — after pauseBeforeResults' },
] as const;

function AudioPhaseCard({
  phaseKey,
  label,
  note,
  clip,
  onChange,
}: {
  phaseKey: string;
  label: string;
  note: string;
  clip: AudioClip;
  onChange: (c: AudioClip) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadErr('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('phase', phaseKey);
    const res = await fetch('/api/admin/upload-audio', { method: 'POST', body: fd });
    if (res.ok) {
      const { src } = await res.json() as { src: string };
      onChange({ ...clip, src });
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setUploadErr(body.error ?? 'Upload failed');
    }
    setUploading(false);
  }

  const filename = clip.src ? clip.src.split('/').pop() : null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

      {/* Header */}
      <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
        <div>
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <span className="ml-2 font-mono text-xs text-gray-400">{phaseKey}</span>
        </div>
        {filename && <span className="font-mono text-xs text-gray-400">{filename}</span>}
      </div>

      {/* Note */}
      <div className="border-t border-gray-100 px-5 py-2">
        <p className="text-xs text-gray-400">{note}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-4">

        {/* Upload */}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,.ogg,.wav,.webm,.m4a,audio/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading…' : clip.src ? 'Replace' : 'Upload'}
          </button>
          {clip.src && (
            <button
              onClick={() => onChange({ ...clip, src: '' })}
              className="rounded border border-red-100 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              Remove
            </button>
          )}
          {uploadErr && <span className="text-xs text-red-500">{uploadErr}</span>}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <FieldLabel>Volume</FieldLabel>
          <input
            type="range" min={0} max={1} step={0.01}
            value={clip.volume}
            onChange={e => onChange({ ...clip, volume: Number(e.target.value) })}
            className="w-24 accent-gray-700"
          />
          <span className="w-8 text-right font-mono text-xs text-gray-500">{clip.volume.toFixed(2)}</span>
        </div>

        {/* Loop */}
        <label className="flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={clip.loop}
            onChange={e => onChange({ ...clip, loop: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-gray-300 accent-gray-700"
          />
          <span className="text-xs text-gray-700">Loop</span>
        </label>

      </div>
    </div>
  );
}
