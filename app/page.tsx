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

  // Leaderboard
  type LBEntry = { id: string; name: string; score: number };
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lbEntries,       setLbEntries]       = useState<LBEntry[]>([]);
  const [lbLoading,       setLbLoading]       = useState(false);
  const [lbError,         setLbError]         = useState('');
  const scoreSubmittedRef = useRef(false);

  // Game state
  const [phase,         setPhase]         = useState<Phase>('start');
  const [streak,        setStreak]        = useState(0);
  const [usedIds,       setUsedIds]       = useState<Set<string>>(new Set());
  const [encounter,     setEncounter]     = useState<Encounter | null>(null);
  const [rollResult,    setRollResult]    = useState<RollResult | null>(null);
  const [reactionLine,  setReactionLine]  = useState('');
  const [lastReaction,  setLastReaction]  = useState('');
  const [diceRevealed,  setDiceRevealed]  = useState(false);
  const [gradientShifted, setGradientShifted] = useState(false);
  const [resultsUiVisible, setResultsUiVisible] = useState(false);
  const [resultsRiveVisible, setResultsRiveVisible] = useState(true);
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const [hoverJaw,      setHoverJaw]      = useState(0);
  const [enterHoverTarget, setEnterHoverTarget] = useState<0 | 1 | 2>(0);
  const [enterHoverValue, setEnterHoverValue] = useState(0);

  // Audio state
  const [jawOpen,        setJawOpen]        = useState(SETTINGS.jawDefault);
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
  const smoothedRef    = useRef(SETTINGS.jawDefault);
  const hoverRafRef    = useRef<number>(0);
  const hoverJawRef    = useRef(0);
  const enterHoverRafRef = useRef<number>(0);
  const enterHoverRef    = useRef(0);
  const voiceCache     = useRef(new Map<string, string>());
  // Mirror rollResult in a ref so reacting-phase callbacks always read fresh value
  const rollResultRef   = useRef<RollResult | null>(null);
  // Mirror streak + usedIds so reacting callbacks read current values
  const streakRef       = useRef(0);
  const usedIdsRef      = useRef<Set<string>>(new Set());
  // Track last pre-roll line to avoid immediate repeats
  const lastPreRollRef      = useRef('');
  // Prefetched pre-roll line + its raw key (picked during presenting so audio is cached before click)
  const prefetchedPreRollRef = useRef<string | null>(null);
  const lastGreetingRef   = useRef('');
  const encounterCountRef = useRef(0);
  // Phase audio
  const phaseAudioRef   = useRef<AudioBufferSourceNode | null>(null);
  const audioCacheRef   = useRef(new Map<string, AudioBuffer>());

  // Keep refs in sync
  useEffect(() => { rollResultRef.current = rollResult; }, [rollResult]);
  useEffect(() => { streakRef.current = streak; },        [streak]);

  // Quick fade pulse on the dialogue name label whenever the streak value changes
  const [streakLabelFading, setStreakLabelFading] = useState(false);
  const prevStreakRef = useRef(streak);
  useEffect(() => {
    if (prevStreakRef.current === streak) return;
    prevStreakRef.current = streak;
    setStreakLabelFading(true);
    const t = setTimeout(() => setStreakLabelFading(false), 150);
    return () => clearTimeout(t);
  }, [streak]);

  // Smoothly interpolate jaw open value toward hover target (0.3 / 0.6 / 0.9 per button)
  useEffect(() => {
    const HOVER_JAW = [SETTINGS.hoverJaw.button0, SETTINGS.hoverJaw.button1, SETTINGS.hoverJaw.button2];
    const target = hoveredOption !== null ? HOVER_JAW[hoveredOption] : 0;
    cancelAnimationFrame(hoverRafRef.current);
    function animate() {
      hoverJawRef.current += (target - hoverJawRef.current) * SETTINGS.hoverJaw.speed;
      if (Math.abs(hoverJawRef.current - target) < 0.002) {
        hoverJawRef.current = target;
        setHoverJaw(target);
        return;
      }
      setHoverJaw(hoverJawRef.current);
      hoverRafRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(hoverRafRef.current);
  }, [hoveredOption]);

  // Fade the start screen "enterHover" Rive input 0→1 on hover, 1→0 on unhover,
  // and up to 2 on click — rising moves use fadeInDuration, falling moves use fadeOutDuration
  useEffect(() => {
    const target     = enterHoverTarget;
    const startValue = enterHoverRef.current;
    const duration   = target > startValue ? SETTINGS.enterHover.fadeInDuration : SETTINGS.enterHover.fadeOutDuration;
    const startTime   = performance.now();
    cancelAnimationFrame(enterHoverRafRef.current);
    function animate(now: number) {
      const t = duration > 0 ? Math.min(1, (now - startTime) / duration) : 1;
      const value = startValue + (target - startValue) * t;
      enterHoverRef.current = value;
      setEnterHoverValue(value);
      if (t < 1) enterHoverRafRef.current = requestAnimationFrame(animate);
    }
    enterHoverRafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(enterHoverRafRef.current);
  }, [enterHoverTarget]);
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
    smoothedRef.current = SETTINGS.jawDefault;
    setJawOpen(SETTINGS.jawDefault);
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
        // Lerp jaw back to default pose over jawReturnDuration ms
        const startVal  = smoothedRef.current;
        const startTime = performance.now();
        const ease = (now: number) => {
          const dur = SETTINGS.jawReturnDuration;
          const t   = dur > 0 ? Math.min(1, (now - startTime) / dur) : 1;
          const val = startVal + (SETTINGS.jawDefault - startVal) * t;
          smoothedRef.current = val;
          setJawOpen(val);
          if (t < 1) rafRef.current = requestAnimationFrame(ease);
        };
        rafRef.current = requestAnimationFrame(ease);
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

  // presenting: speak encounter narration, then await player choice.
  // Also background-fetches the next pre-roll line into voiceCache so it plays instantly on click.
  useEffect(() => {
    if (phase !== 'presenting' || !encounter) return;
    const narration = replaceShortcodes(encounter.narration, playerName);
    setCurrentDialogue(narration);
    speak(narration).catch(console.error);

    // Pick the pre-roll line now and warm the cache — do NOT call speak() here
    const rawLine = pickLine(lastPreRollRef.current, PRE_ROLL_LINES);
    const line    = replaceShortcodes(rawLine, playerName);
    prefetchedPreRollRef.current = rawLine; // store raw key so resolving can update lastPreRollRef
    if (!voiceCache.current.has(line)) {
      fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: line, speed: SETTINGS.speechSpeed }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.audio) voiceCache.current.set(line, data.audio as string); })
        .catch(() => {/* silent — resolving will fetch on demand if this fails */});
    }

    return () => stopSpeech();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, encounter?.id]);

  // resolving: speak pre-roll line concurrently while dice animation plays.
  // Uses the line prefetched during presenting (already in voiceCache) for zero-latency playback.
  useEffect(() => {
    if (phase !== 'resolving' || !rollResultRef.current) return;
    // Reuse prefetched line if available, otherwise pick fresh
    const rawLine = prefetchedPreRollRef.current ?? pickLine(lastPreRollRef.current, PRE_ROLL_LINES);
    const line    = replaceShortcodes(rawLine, playerName);
    lastPreRollRef.current       = rawLine;
    prefetchedPreRollRef.current = null;
    setCurrentDialogue(line);
    setDiceRevealed(false);
    setGradientShifted(false);
    const speakTimer    = setTimeout(() => speak(line).catch(console.error), SETTINGS.pauseBeforePreRoll);
    const revealTimer   = setTimeout(() => setDiceRevealed(true), SETTINGS.pauseDiceReveal);
    const gradientTimer = setTimeout(() => setGradientShifted(true), SETTINGS.pauseGradientShift);
    const doneTimer   = setTimeout(() => {
      const result = rollResultRef.current!;
      const kind   = result.success ? 'affirmative' : 'negative';
      const rawReaction = pickReaction(kind, result.choiceIndex, lastReaction, REACTION_LINES);
      const reaction = replaceShortcodes(rawReaction, playerName);
      setReactionLine(reaction);
      setLastReaction(rawReaction);
      setPhase('reacting');
    }, SETTINGS.pauseDiceRoll);
    return () => { clearTimeout(speakTimer); clearTimeout(revealTimer); clearTimeout(gradientTimer); clearTimeout(doneTimer); stopSpeech(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // reacting: speak reaction, then advance based on roll outcome
  useEffect(() => {
    if (phase !== 'reacting' || !reactionLine) return;
    let active = true;
    const resolvedReaction = replaceShortcodes(reactionLine, playerName);
    setCurrentDialogue(resolvedReaction);

    // Bump the streak as soon as the reaction speech starts, not when it finishes
    const nextStreak = rollResultRef.current?.success
      ? streakRef.current + (rollResultRef.current?.steps ?? 1)
      : null;
    if (nextStreak !== null) setStreak(nextStreak);

    speak(resolvedReaction).then(() => {
      if (!active) return;
      if (rollResultRef.current?.success && nextStreak !== null) {
        const nextIds = new Set(usedIdsRef.current);
        const nextEnc = pickEncounter(nextStreak, nextIds, ENCOUNTERS);
        nextIds.add(nextEnc.id);
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

  // reveal the results UI (score + buttons) after an admin-configurable delay,
  // crossfading the Rive canvas out at an independently offset time
  useEffect(() => {
    if (phase !== 'results') {
      setResultsUiVisible(false);
      setResultsRiveVisible(true);
      return;
    }
    const uiTimer   = setTimeout(() => setResultsUiVisible(true), SETTINGS.pauseResultsReveal);
    const riveTimer = setTimeout(() => setResultsRiveVisible(false), SETTINGS.pauseResultsReveal + SETTINGS.resultsCrossfade.offset);
    return () => { clearTimeout(uiTimer); clearTimeout(riveTimer); };
  }, [phase]);

  // auto-submit score and pre-fetch leaderboard when results screen appears
  useEffect(() => {
    if (phase !== 'results') return;
    if (streak > 0 && !scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, score: streak }),
      }).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const fetchLeaderboard = async () => {
    setLbLoading(true);
    setLbError('');
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error('Failed to load');
      const { entries } = await res.json() as { entries: LBEntry[] };
      setLbEntries(entries);
    } catch {
      setLbError('Could not load leaderboard.');
    } finally {
      setLbLoading(false);
    }
  };

  const handleOpenLeaderboard = () => { fetchLeaderboard(); setShowLeaderboard(true); };

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleStart = () => {
    setIsStartFading(true);
    setEnterHoverTarget(2);
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
    scoreSubmittedRef.current = false;
    setShowLeaderboard(false);
    setIsStartFading(false);
    setShowStartButton(false);
    setPhase('start');
    unlock();
    // skip naming screen on replay if we already have a name
    setTimeout(() => setPhase('greeting'), SETTINGS.pauseBeforeGreeting);
  };

  const riveScene     = PHASE_TO_SCENE[phase];
  const riveFlameLevel = hoveredOption ?? 0;
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
    (phase === 'resolving' && gradientShifted)
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
    {/* Persistent Leaderboard button — fades out when leaderboard opens */}
    {(phase === 'start' || phase === 'results') && (
      <button
        onClick={() => { playClickSound(); handleOpenLeaderboard(); }}
        className="fixed top-6 right-8 z-20 font-body text-sm tracking-widest text-white/40 hover:text-white/80 bg-transparent border-none"
        style={{ opacity: showLeaderboard ? 0 : 1, transition: `opacity ${SETTINGS.pauseUiFade}ms ease-out`, pointerEvents: showLeaderboard ? 'none' : 'auto' }}
      >
        Leaderboard
      </button>
    )}

    {/* Leaderboard overlay — top-level so it works from start and results */}
    {(phase === 'start' || phase === 'results') && (
      <div
        className="fixed inset-0 z-30 flex flex-col items-center justify-center"
        style={{ opacity: showLeaderboard ? 1 : 0, transition: `opacity ${SETTINGS.pauseUiFade}ms ease-out`, pointerEvents: showLeaderboard ? 'auto' : 'none' }}
      >
        <button
          onClick={() => setShowLeaderboard(false)}
          className="absolute top-6 right-8 font-body text-sm tracking-widest text-white/40 transition-colors hover:text-white/80 bg-transparent border-none"
        >
          ← Back
        </button>
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
          <h2 className="font-display tracking-widest text-white/50 text-base">Leaderboard</h2>
          <GameDivider />
          {lbLoading && <p className="font-body text-sm text-white/40 tracking-widest">Loading…</p>}
          {lbError   && <p className="font-body text-sm text-red-400/80">{lbError}</p>}
          {!lbLoading && !lbError && (
            <ol className="w-full flex flex-col gap-2">
              {lbEntries.map((entry, i) => {
                const isPlayer = entry.name.toLowerCase() === playerName.toLowerCase() && entry.score === streak;
                return (
                  <li key={entry.id} className={`flex items-center justify-between font-body text-sm tracking-wide px-3 py-2 ${isPlayer ? 'text-accent' : 'text-white/60'}`}>
                    <span className="w-6 shrink-0 font-display text-white/30">{i + 1}</span>
                    <span className="flex-1 px-3">{entry.name}</span>
                    <span className="font-display text-lg">{entry.score}</span>
                  </li>
                );
              })}
              {lbEntries.length === 0 && <p className="font-body text-sm text-white/40 text-center tracking-widest">No entries yet.</p>}
            </ol>
          )}
        </div>
      </div>
    )}

    {SETTINGS.debugOverlay && (
      <div className="fixed top-2 left-2 z-50 flex flex-col gap-0.5 rounded bg-black/70 px-2 py-1 font-mono text-xs text-lime-400 pointer-events-none">
        <span>Roll: {rollResult?.roll ?? '–'}</span>
        <span>Jaw: {jawOpen.toFixed(3)}</span>
      </div>
    )}

    <main className="relative z-10 min-h-screen flex flex-col items-center">

      {/* HUD bar */}
      <div
        className="w-full max-w-lg h-16 flex items-end justify-between px-2 pb-1 transition-opacity duration-300 shrink-0"
        style={{ opacity: (phase === 'start' || phase === 'naming') ? 0 : 1 }}
      />

      {/* Start overlay — over full main area so logo+button are viewport-centred */}
      {phase === 'start' && showStartButton && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-0 text-center"
          style={{
            opacity:       isStartFading || showLeaderboard ? 0 : 1,
            transition:    `opacity ${SETTINGS.pauseUiFade}ms ease-out`,
            pointerEvents: isStartFading || showLeaderboard ? 'none' : 'auto',
          }}
        >
          <div style={{ transform: `scale(${isMobile ? SETTINGS.startScreen.scaleMobile : SETTINGS.startScreen.scale})`, transformOrigin: 'center center' }}
               className="flex flex-col items-center gap-0">
            <img src="/SkullGuyLogo.svg" alt="SkullGuy" className="w-[317px]" style={{ marginBottom: SETTINGS.startScreen.logoGap }} />
            <HexButton onClick={handleStart} onMouseEnter={() => setEnterHoverTarget(1)} onMouseLeave={() => setEnterHoverTarget(0)}>Enter</HexButton>
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

      {/* Results overlay */}
      {phase === 'results' && !showLeaderboard && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8"
          style={{
            opacity:       resultsUiVisible ? 1 : 0,
            transition:    `opacity ${SETTINGS.resultsCrossfade.uiFadeDuration}ms ease-out`,
            pointerEvents: resultsUiVisible ? 'auto' : 'none',
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <h2 className="font-display tracking-widest text-white/50 text-base">Score</h2>
            <GameDivider />
            <p className="font-display text-accent" style={{ fontSize: 'clamp(5rem, 12vw, 9rem)', lineHeight: 1 }}>
              {streak}
            </p>
          </div>
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
          <div
            className="relative"
            style={{
              opacity:    phase === 'results' && !resultsRiveVisible ? 0 : 1,
              transition: `opacity ${SETTINGS.resultsCrossfade.riveFadeDuration}ms ease-out`,
            }}
          >
            <GameRive scene={riveScene} jawOpen={Math.max(jawOpen, hoverJaw)} roll={riveRoll} emotion={riveEmotion} diceOutcome={riveDiceOutcome} flameLevel={riveFlameLevel} enterHover={enterHoverValue}
              scale={isMobile ? SETTINGS.riveScale.scaleMobile : SETTINGS.riveScale.scale} />
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
                style={{
                  fontSize: SETTINGS.dialogue.name.fontSize,
                  opacity: streakLabelFading ? 0 : SETTINGS.dialogue.name.opacity,
                  transition: 'opacity 150ms ease',
                }}
              >
                {streak > 0 ? `Streak - ${streak}` : SETTINGS.dialogue.name.text}
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
            transform:     `translateY(${isMobile ? SETTINGS.layout.optionBlockOffsetMobile : SETTINGS.layout.optionBlockOffset}vh)`,
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
              onMouseEnter={() => setHoveredOption(i)}
              onMouseLeave={() => setHoveredOption(null)}
              innerClassName=""
              style={{ minWidth: SETTINGS.optionButtonMinWidth }}
              hoverVolumeMultiplier={SETTINGS.optionButtonHoverVolumeMultiplier}
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
