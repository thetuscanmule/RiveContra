'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { GameRive } from '@/components/GameRive';
import { BackgroundRings } from '@/components/BackgroundRings';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { BackgroundTexture } from '@/components/BackgroundTexture';
import { CustomCursor } from '@/components/CustomCursor';
import { HexButton } from '@/components/HexButton';
import type { ThemeKey } from '@/lib/game/settings';
import { ENCOUNTERS } from '@/lib/game/encounters';
import { GREETING_LINES, PRE_ROLL_LINES, REACTION_LINES } from '@/lib/game/reactionLines';
import { pickEncounter, resolveRoll, pickReaction, pickLine, stepRange, luckBonusForTurn } from '@/lib/game/engine';
import { SETTINGS } from '@/lib/game/settings';
import { playClickSound } from '@/lib/game/playClickSound';
import { replaceShortcodes } from '@/lib/game/replaceShortcodes';
import type { Encounter, RollResult } from '@/lib/game/types';
import { Filter } from 'bad-words';

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

// ─── Shared divider — uses admin dialogue divider texture/width/opacity ─────
function GameDivider() {
  const { src, width, opacity } = SETTINGS.dialogue.divider;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width, opacity }} />
  ) : (
    <div style={{ width, opacity }} className="border-t border-white" />
  );
}

// ─── Audio constants ────────────────────────────────────────────────────────
const GAIN    = 7;
const MAX_JAW = 0.95;

// ─── Music bed ──────────────────────────────────────────────────────────────
// Tries to load /music-bed.mp3 (loop it). Falls back to oscillator drone.
async function startMusicBed(ctx: AudioContext): Promise<void> {
  try {
    const res = await fetch('/music-bed.mp3');
    if (!res.ok) throw new Error('not found');
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    gain.connect(ctx.destination);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop   = true;
    source.connect(gain);
    source.start();
    return;
  } catch {
    // No MP3 found — fall back to oscillator drone
  }

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.06, ctx.currentTime);
  master.connect(ctx.destination);

  const lfo     = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.3;
  lfoGain.gain.value  = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);
  lfo.start();

  [55, 82.41].forEach(freq => {
    const osc = ctx.createOscillator();
    osc.type            = 'sine';
    osc.frequency.value = freq;
    osc.connect(master);
    osc.start();
  });
}

// ─── Phase type ─────────────────────────────────────────────────────────────
type Phase = 'start' | 'naming' | 'greeting' | 'presenting' | 'pre-rolling' | 'resolving' | 'reacting' | 'results';

// 0=intro  1=avatar  2=dice  3=winlose
const PHASE_TO_SCENE: Record<Phase, number> = {
  start:          0,
  naming:         0,
  greeting:       1,
  presenting:     1,
  'pre-rolling':  1,
  resolving:      2,
  reacting:       1,
  results:        3,
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Home() {
  // Player name
  const [playerName,    setPlayerName]    = useState('');
  const [nameInput,     setNameInput]     = useState('');
  const [nameError,     setNameError]     = useState('');

  // Game state
  const [phase,         setPhase]         = useState<Phase>('start');
  const [streak,        setStreak]        = useState(0);
  const [usedIds,       setUsedIds]       = useState<Set<string>>(new Set());
  const [encounter,     setEncounter]     = useState<Encounter | null>(null);
  const [rollResult,    setRollResult]    = useState<RollResult | null>(null);
  const [reactionLine,  setReactionLine]  = useState('');
  const [lastReaction,  setLastReaction]  = useState('');
  const [diceRevealed,  setDiceRevealed]  = useState(false);

  // Audio state
  const [jawOpen,        setJawOpen]        = useState(0);
  const [isSpeaking,     setIsSpeaking]     = useState(false);
  const [isStartFading,  setIsStartFading]  = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  // Responsive start screen scale (switches at Tailwind's md breakpoint: 768px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('playerName') ?? '';
    if (saved) { setPlayerName(saved); setNameInput(saved); }

    document.title = SETTINGS.pageTitle;
    if (SETTINGS.faviconSrc) {
      const el = (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ?? document.createElement('link');
      el.rel = 'icon';
      el.href = SETTINGS.faviconSrc;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // optionsReady: true only after speaking has finished during 'presenting'
  // (avoids 1-frame flash of buttons at phase entry before speak() sets isSpeaking=true)
  const [optionsReady,   setOptionsReady]   = useState(false);
  // currentDialogue: the text being spoken — set before each speak() call so the
  // dialogue panel is populated before the avatar opens its mouth
  const [currentDialogue, setCurrentDialogue] = useState('');

  // Audio refs (stable across renders)
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const musicStarted   = useRef(false);
  const sourceRef      = useRef<AudioBufferSourceNode | null>(null);
  const rafRef         = useRef<number>(0);
  const smoothedRef    = useRef(0);
  const voiceCache     = useRef(new Map<string, string>());
  // Mirror rollResult in a ref so reacting-phase callbacks always read fresh value
  const rollResultRef   = useRef<RollResult | null>(null);
  // Mirror streak + usedIds so reacting callbacks read current values
  const streakRef       = useRef(0);
  const usedIdsRef      = useRef<Set<string>>(new Set());
  // Track last pre-roll line to avoid immediate repeats
  const lastPreRollRef    = useRef('');
  const lastGreetingRef   = useRef('');
  const encounterCountRef = useRef(0);
  // Phase audio
  const phaseAudioRef   = useRef<AudioBufferSourceNode | null>(null);
  const audioCacheRef   = useRef(new Map<string, AudioBuffer>());

  // Keep refs in sync
  useEffect(() => { rollResultRef.current = rollResult; }, [rollResult]);
  useEffect(() => { streakRef.current = streak; },        [streak]);
  useEffect(() => { usedIdsRef.current = usedIds; },      [usedIds]);

  // Reset optionsReady whenever a new encounter begins
  useEffect(() => { setOptionsReady(false); }, [encounter?.id]);
  // Set optionsReady after speaking finishes during presenting.
  // 100ms guard skips the brief isSpeaking=false at phase entry before speak() fires.
  useEffect(() => {
    if (phase !== 'presenting' || isSpeaking || !encounter) return;
    const t = setTimeout(() => setOptionsReady(true), 100);
    return () => clearTimeout(t);
  }, [phase, isSpeaking, encounter]);

  // ── Audio helpers ──────────────────────────────────────────────────────────

  const stopSpeech = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) {
      sourceRef.current.onended = null; // prevent stale callbacks
      try { sourceRef.current.stop(); } catch { /* already ended */ }
      sourceRef.current = null;
    }
    setIsSpeaking(false);
    smoothedRef.current = 0;
    setJawOpen(0);
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    stopSpeech();
    setIsSpeaking(true);

    // Cache lookup
    let base64 = voiceCache.current.get(text);
    if (!base64) {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed: SETTINGS.speechSpeed }),
      });
      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
      const data = await res.json();
      base64 = data.audio as string;
      voiceCache.current.set(text, base64!);
    }

    // Decode base64 → AudioBuffer
    const bin = atob(base64!);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') await ctx.resume();
    const decoded = await ctx.decodeAudioData(buf.buffer);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    const dataArr = new Uint8Array(analyser.frequencyBinCount);

    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = source;

    return new Promise<void>((resolve) => {
      source.start();

      const tick = () => {
        analyser.getByteTimeDomainData(dataArr);
        let sumSq = 0;
        for (let i = 0; i < dataArr.length; i++) {
          const v = (dataArr[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms     = Math.sqrt(sumSq / dataArr.length);
        const clamped = Math.min(rms * GAIN, MAX_JAW);
        smoothedRef.current = smoothedRef.current * SETTINGS.smoothing + clamped * (1 - SETTINGS.smoothing);
        setJawOpen(smoothedRef.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      source.onended = () => {
        cancelAnimationFrame(rafRef.current);
        setIsSpeaking(false);
        // Ease jaw back to 0
        const ease = () => {
          smoothedRef.current *= 0.82;
          setJawOpen(smoothedRef.current);
          if (smoothedRef.current > 0.005) {
            rafRef.current = requestAnimationFrame(ease);
          } else {
            setJawOpen(0);
            smoothedRef.current = 0;
          }
        };
        ease();
        resolve();
      };
    });
  }, [stopSpeech]);

  const unlock = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    if (!musicStarted.current) {
      musicStarted.current = true;
      startMusicBed(ctx).catch(console.error);
    }
  }, []);

  // ── Phase effects ──────────────────────────────────────────────────────────

  // greeting: speak greeting → pick first encounter → presenting
  useEffect(() => {
    if (phase !== 'greeting') return;
    let active = true;
    const raw = pickLine(lastGreetingRef.current, GREETING_LINES);
    const greeting = replaceShortcodes(raw, playerName);
    lastGreetingRef.current = raw;
    setCurrentDialogue(greeting);
    speak(greeting).then(() => {
      if (!active) return;
      const enc = pickEncounter(0, new Set(), ENCOUNTERS);
      setEncounter(enc);
      setUsedIds(new Set([enc.id]));
      setPhase('presenting');
    }).catch(console.error);
    return () => { active = false; stopSpeech(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // presenting: speak encounter narration, then await player choice
  useEffect(() => {
    if (phase !== 'presenting' || !encounter) return;
    const narration = replaceShortcodes(encounter.narration, playerName);
    setCurrentDialogue(narration);
    speak(narration).catch(console.error);
    return () => stopSpeech();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, encounter?.id]);

  // resolving: speak pre-roll line concurrently while dice animation plays
  useEffect(() => {
    if (phase !== 'resolving' || !rollResultRef.current) return;
    const rawLine = pickLine(lastPreRollRef.current, PRE_ROLL_LINES);
    const line = replaceShortcodes(rawLine, playerName);
    lastPreRollRef.current = rawLine;
    setCurrentDialogue(line);
    speak(line).catch(console.error);
    setDiceRevealed(false);
    const revealTimer = setTimeout(() => setDiceRevealed(true), SETTINGS.pauseDiceReveal);
    const doneTimer   = setTimeout(() => {
      const result = rollResultRef.current!;
      const kind   = result.success ? 'affirmative' : 'negative';
      const rawReaction = pickReaction(kind, result.choiceIndex, lastReaction, REACTION_LINES);
      const reaction = replaceShortcodes(rawReaction, playerName);
      setReactionLine(reaction);
      setLastReaction(rawReaction);
      setPhase('reacting');
    }, SETTINGS.pauseDiceRoll);
    return () => { clearTimeout(revealTimer); clearTimeout(doneTimer); stopSpeech(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // reacting: speak reaction, then advance based on roll outcome
  useEffect(() => {
    if (phase !== 'reacting' || !reactionLine) return;
    let active = true;
    const resolvedReaction = replaceShortcodes(reactionLine, playerName);
    setCurrentDialogue(resolvedReaction);
    speak(resolvedReaction).then(() => {
      if (!active) return;
      if (rollResultRef.current?.success) {
        const nextStreak = streakRef.current + (rollResultRef.current?.steps ?? 1);
        const nextIds    = new Set(usedIdsRef.current);
        const nextEnc    = pickEncounter(nextStreak, nextIds, ENCOUNTERS);
        nextIds.add(nextEnc.id);
        setStreak(nextStreak);
        setUsedIds(nextIds);
        setEncounter(nextEnc);
        setPhase('presenting');
      } else {
        setTimeout(() => { if (active) setPhase('results'); }, SETTINGS.pauseBeforeResults);
      }
    }).catch(console.error);
    return () => { active = false; stopSpeech(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reactionLine]);

  // phase audio: play clip assigned to each phase, stop when phase changes
  useEffect(() => {
    const clip = SETTINGS.audio.phases[phase];
    if (!clip?.src) {
      try { phaseAudioRef.current?.stop(); } catch { /* already ended */ }
      phaseAudioRef.current = null;
      return;
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    let active = true;
    (async () => {
      try { phaseAudioRef.current?.stop(); } catch { /* already ended */ }
      phaseAudioRef.current = null;

      let buf = audioCacheRef.current.get(clip.src);
      if (!buf) {
        const ab = await (await fetch(clip.src)).arrayBuffer();
        buf = await ctx.decodeAudioData(ab);
        audioCacheRef.current.set(clip.src, buf);
      }
      if (!active) return;

      const node = ctx.createBufferSource();
      node.buffer = buf;
      node.loop   = clip.loop;
      const gain  = ctx.createGain();
      gain.gain.value = clip.volume;
      node.connect(gain);
      gain.connect(ctx.destination);
      node.start();
      phaseAudioRef.current = node;
      if (!clip.loop) node.onended = () => { if (phaseAudioRef.current === node) phaseAudioRef.current = null; };
    })().catch(console.error);

    return () => {
      active = false;
      try { phaseAudioRef.current?.stop(); } catch { /* already ended */ }
      phaseAudioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleStart = () => {
    setIsStartFading(true);
    unlock();
    setPhase('naming');
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setNameError('Please enter a name.'); return; }
    if (new Filter().isProfane(trimmed)) {
      setNameError('Please choose a different name.');
      return;
    }
    setNameError('');
    const titled = toTitleCase(trimmed);
    setPlayerName(titled);
    localStorage.setItem('playerName', titled);
    setTimeout(() => setPhase('greeting'), SETTINGS.pauseBeforeGreeting);
  };

  const handleOption = (threshold: number, choiceIndex: number) => {
    const bonus  = luckBonusForTurn(SETTINGS.luck, encounterCountRef.current);
    encounterCountRef.current += 1;
    const result = { ...resolveRoll(threshold, bonus), choiceIndex };
    rollResultRef.current = result;
    setRollResult(result);
    setPhase('resolving');
  };

  const handleReplay = () => {
    stopSpeech();
    setStreak(0);
    streakRef.current     = 0;
    setRollResult(null);
    rollResultRef.current = null;
    setReactionLine('');
    setLastReaction('');
    setEncounter(null);
    setUsedIds(new Set());
    usedIdsRef.current      = new Set();
    encounterCountRef.current = 0;
    setIsStartFading(false);
    setShowStartButton(false);
    setPhase('start');
    unlock();
    // skip naming screen on replay if we already have a name
    setTimeout(() => setPhase('greeting'), SETTINGS.pauseBeforeGreeting);
  };

  const riveScene   = PHASE_TO_SCENE[phase];
  const riveRoll    = rollResult?.roll ?? 0;
  // emotion: 1=win during/after success, 2=lose during/after failure, 0=idle
  const riveEmotion = (phase === 'reacting' || phase === 'results')
    ? (rollResult?.success ? 1 : 2)
    : 0;
  // fires dicewin/dicefail trigger the moment the dice result is revealed
  const riveDiceOutcome: 'win' | 'fail' | null =
    (phase === 'resolving' && diceRevealed && rollResult)
      ? (rollResult.success ? 'win' : 'fail')
      : null;

  const gradientTheme: ThemeKey =
    (phase === 'resolving' && diceRevealed)
      ? (rollResult?.success ? 'win' : 'lose')
      : 'default';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    <CustomCursor />
    <BackgroundGradient theme={gradientTheme} />
    <BackgroundTexture />
    <BackgroundRings />

    {/* RiveXContra logo — bottom-center, fixed */}
    <img
      src="/RiveXContra.svg"
      alt="Rive × Contra"
      className="fixed bottom-7 left-1/2 z-20 h-[28px] -translate-x-1/2 opacity-60 transition-opacity duration-150 hover:opacity-100"
    />
    <main className="relative z-10 min-h-screen flex flex-col items-center">

      {/* HUD bar */}
      <div
        className="w-full max-w-lg h-16 flex items-end justify-between px-2 pb-1 transition-opacity duration-300 shrink-0"
        style={{ opacity: (phase === 'start' || phase === 'naming') ? 0 : 1 }}
      >
        <span className="font-mono text-sm text-green-500">Streak: {streak}</span>
      </div>

      {/* Start overlay — over full main area so logo+button are viewport-centred */}
      {phase === 'start' && showStartButton && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-0 text-center"
          style={{
            opacity:       isStartFading ? 0 : 1,
            transition:    `opacity ${SETTINGS.pauseUiFade}ms ease-out`,
            pointerEvents: isStartFading ? 'none' : 'auto',
          }}
        >
          <div style={{ transform: `scale(${isMobile ? SETTINGS.startScreen.scaleMobile : SETTINGS.startScreen.scale})`, transformOrigin: 'center center' }}
               className="flex flex-col items-center gap-0">
            <img src="/SkullGuyLogo.svg" alt="SkullGuy" className="w-[317px] -mb-3" />
            <HexButton onClick={handleStart}>Enter</HexButton>
          </div>
        </div>
      )}

      {/* Naming overlay */}
      {phase === 'naming' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-6 w-full max-w-xl px-8">

            {/* Label */}
            <h3 className="font-display tracking-widest text-white" style={{ fontSize: SETTINGS.dialogue.name.fontSize, opacity: 0.5 }}>
              type your name
            </h3>

            <GameDivider />

            {/* Large styled input */}
            <input
              type="text"
              value={toTitleCase(nameInput)}
              onChange={e => { setNameInput(e.target.value.slice(0, 16)); setNameError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              autoFocus
              className="w-full bg-transparent text-center font-display text-accent focus:outline-none placeholder:text-accent/30"
              style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', lineHeight: 1 }}
            />

            {nameError && (
              <p className="font-body text-sm text-red-400/80 tracking-wide -mt-4">{nameError}</p>
            )}

            {/* Save button */}
            <HexButton onClick={handleSaveName} disabled={!nameInput.trim()}>
              Save
            </HexButton>
          </div>
        </div>
      )}

      {/* Results overlay — full-screen, sits above everything */}
      {phase === 'results' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8">

          {/* Leaderboard link — top right */}
          <a
            href="#"
            className="absolute top-6 right-8 font-body text-sm tracking-widest text-white/40 transition-colors hover:text-white/80"
          >
            Leaderboard
          </a>

          {/* Score display */}
          <div className="flex flex-col items-center gap-3">
            <h2 className="font-display tracking-widest text-white/50 text-base">Score</h2>
            <GameDivider />
            <p className="font-display text-accent" style={{ fontSize: 'clamp(5rem, 12vw, 9rem)', lineHeight: 1 }}>
              {streak}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col items-center" style={{ gap: `${SETTINGS.optionButtonGap}vh` }}>
            <HexButton onClick={() => { playClickSound(); handleReplay(); }} style={{ minWidth: SETTINGS.resultsButtonMinWidth }}>Play Again</HexButton>
            {SETTINGS.contraUrl && (
              <HexButton onClick={() => window.open(SETTINGS.contraUrl, '_blank')} style={{ minWidth: SETTINGS.resultsButtonMinWidth }}>View on Contra</HexButton>
            )}
          </div>

        </div>
      )}

      {/* Centred block: Rive canvas (row 1) + UI panel (row 2) */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="flex flex-col items-center"
          style={{
            transform:  `translateY(${isMobile ? SETTINGS.layout.blockOffsetMobile : SETTINGS.layout.blockOffset}vh)`,
            gap:        `${isMobile ? SETTINGS.layout.rowGapMobile : SETTINGS.layout.rowGap}vh`,
          }}
        >

          {/* Row 1 — Rive canvas */}
          <div className="relative">
            <GameRive scene={riveScene} jawOpen={jawOpen} roll={riveRoll} emotion={riveEmotion} diceOutcome={riveDiceOutcome}
              scale={isMobile ? SETTINGS.riveScale.scaleMobile : SETTINGS.riveScale.scale} />


            {/* Jaw debug */}
            <span className="absolute bottom-2 right-3 font-mono text-xs tabular-nums text-green-700">
              jaw {jawOpen.toFixed(3)}
            </span>
          </div>

          {/* Row 2 — Dialogue + option buttons */}
          <div className="relative w-full max-w-lg h-44">

        {/* Dialogue — shown whenever currentDialogue is set, fades out for options */}
        <div
          className="absolute inset-0 flex items-center justify-center px-2"
          style={{
            opacity:    (phase === 'presenting' && optionsReady) ? 0 : 1,
            transition: `opacity ${SETTINGS.dialogueFade}ms ease`,
            pointerEvents: 'none',
          }}
        >
          {currentDialogue && phase !== 'start' && phase !== 'results' && (
            <div className="flex flex-col items-center gap-2 text-center">
              <h3
                className="font-display tracking-widest"
                style={{ fontSize: SETTINGS.dialogue.name.fontSize, opacity: SETTINGS.dialogue.name.opacity }}
              >
                {SETTINGS.dialogue.name.text}
              </h3>
              <GameDivider />
              <p
                className="font-body leading-relaxed"
                style={{ fontSize: SETTINGS.dialogue.body.fontSize, opacity: SETTINGS.dialogue.body.opacity, lineHeight: SETTINGS.dialogue.body.lineHeight }}
              >
                {currentDialogue}
              </p>
            </div>
          )}
        </div>

        {/* Option buttons — fades in once narration speech ends */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            gap:           `${SETTINGS.optionButtonGap}vh`,
            opacity:       (phase === 'presenting' && optionsReady) ? 1 : 0,
            transition:    `opacity ${SETTINGS.dialogueFade}ms ease`,
            pointerEvents: (phase === 'presenting' && optionsReady) ? 'auto' : 'none',
          }}
        >
          {encounter?.options.map((opt, i) => (
            <HexButton
              key={opt.threshold}
              onClick={() => handleOption(opt.threshold, i)}
              innerClassName=""
              style={{ minWidth: SETTINGS.optionButtonMinWidth }}
            >
              <span className="flex items-center justify-between gap-4 w-full">
                <span>{opt.label}</span>
                <span className="shrink-0 text-xs font-mono opacity-50 group-hover:opacity-70">
                  {stepRange(opt.threshold)}
                </span>
              </span>
            </HexButton>
          ))}
        </div>

      </div>

        </div>{/* end centered block */}
      </div>{/* end flex-1 */}

    </main>
    </>
  );
}
