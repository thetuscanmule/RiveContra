'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { GameRive } from '@/components/GameRive';
import { ENCOUNTERS } from '@/lib/game/encounters';
import { GREETING, PRE_ROLL_LINES, REACTION_LINES } from '@/lib/game/reactionLines';
import { pickEncounter, resolveRoll, pickReaction, pickLine, stepRange } from '@/lib/game/engine';
import { SETTINGS } from '@/lib/game/settings';
import type { Encounter, RollResult } from '@/lib/game/types';

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
type Phase = 'start' | 'greeting' | 'presenting' | 'pre-rolling' | 'resolving' | 'reacting' | 'results';

// 0=intro  1=avatar  2=dice  3=winlose
const PHASE_TO_SCENE: Record<Phase, number> = {
  start:          0,
  greeting:       1,
  presenting:     1,
  'pre-rolling':  1,
  resolving:      2,
  reacting:       1,
  results:        3,
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Home() {
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
  const [jawOpen,    setJawOpen]    = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
  const lastPreRollRef  = useRef('');

  // Keep refs in sync
  useEffect(() => { rollResultRef.current = rollResult; }, [rollResult]);
  useEffect(() => { streakRef.current = streak; },        [streak]);
  useEffect(() => { usedIdsRef.current = usedIds; },      [usedIds]);

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
    speak(GREETING).then(() => {
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
    speak(encounter.narration).catch(console.error);
    return () => stopSpeech();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, encounter?.id]);

  // pre-rolling: speak a pre-roll line, then hand off to resolving (dice anim)
  useEffect(() => {
    if (phase !== 'pre-rolling') return;
    let active = true;
    const line = pickLine(lastPreRollRef.current, PRE_ROLL_LINES);
    lastPreRollRef.current = line;
    speak(line).then(() => {
      if (active) setPhase('resolving');
    }).catch(console.error);
    return () => { active = false; stopSpeech(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // resolving: reveal dice number after pauseDiceReveal, then transition after pauseDiceRoll
  useEffect(() => {
    if (phase !== 'resolving' || !rollResultRef.current) return;
    setDiceRevealed(false);
    const revealTimer = setTimeout(() => setDiceRevealed(true), SETTINGS.pauseDiceReveal);
    const doneTimer   = setTimeout(() => {
      const result = rollResultRef.current!;
      const kind   = result.success ? 'affirmative' : 'negative';
      const line   = pickReaction(kind, lastReaction, REACTION_LINES);
      setReactionLine(line);
      setLastReaction(line);
      setPhase('reacting');
    }, SETTINGS.pauseDiceRoll);
    return () => { clearTimeout(revealTimer); clearTimeout(doneTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // reacting: speak reaction, then advance based on roll outcome
  useEffect(() => {
    if (phase !== 'reacting' || !reactionLine) return;
    let active = true;
    speak(reactionLine).then(() => {
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

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleStart = () => {
    unlock();
    setTimeout(() => setPhase('greeting'), SETTINGS.pauseBeforeGreeting);
  };

  const handleOption = (threshold: number) => {
    const result = resolveRoll(threshold);
    rollResultRef.current = result;
    setRollResult(result);
    setPhase('pre-rolling');
  };

  const handleReplay = () => {
    stopSpeech();
    setStreak(0);
    streakRef.current = 0;
    setRollResult(null);
    rollResultRef.current = null;
    setReactionLine('');
    setLastReaction('');
    const enc = pickEncounter(0, new Set(), ENCOUNTERS);
    const ids = new Set([enc.id]);
    setEncounter(enc);
    setUsedIds(ids);
    usedIdsRef.current = ids;
    setPhase('presenting');
  };

  const riveScene   = PHASE_TO_SCENE[phase];
  const riveRoll    = rollResult?.roll ?? 0;
  // emotion: 1=win during/after success, 2=lose during/after failure, 0=idle
  const riveEmotion = (phase === 'reacting' || phase === 'results')
    ? (rollResult?.success ? 1 : 2)
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-8">

      {/* ── Start screen ── */}
      {phase === 'start' && (
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-4xl font-bold tracking-widest text-green-400 uppercase">
            Dice Quest
          </h1>
          <p className="text-gray-400 max-w-sm">
            A dice-driven survival game. How long can your streak hold?
          </p>
          <button
            onClick={handleStart}
            className="rounded-xl bg-green-700 px-10 py-4 text-lg font-bold text-white
                       hover:bg-green-600 transition-colors tracking-wide"
          >
            Begin your journey
          </button>
        </div>
      )}

      {/* ── Active game ── */}
      {phase !== 'start' && (
        <>
          <div className="flex items-center justify-between w-full max-w-lg">
            <span className="text-xs uppercase tracking-widest text-gray-600">
              Dice Quest
            </span>
            <span className="font-mono text-sm text-green-500">
              Streak: {streak}
            </span>
          </div>

          {/* Rive canvas + dice/results overlays */}
          <div className="relative">
            <GameRive scene={riveScene} jawOpen={jawOpen} roll={riveRoll} emotion={riveEmotion} />

            {/* Dice result overlay (scene=1) — hidden until pauseDiceReveal elapses */}
            {phase === 'resolving' && diceRevealed && rollResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center
                              bg-gray-950/70 rounded-xl gap-3">
                <p className="text-6xl font-black text-white">{rollResult.roll}</p>
                <p className="text-sm text-gray-300">
                  Needed {rollResult.threshold} or above
                </p>
                <p className={`text-xl font-bold tracking-widest ${
                  rollResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {rollResult.success ? '✓ SUCCESS' : '✗ FAILURE'}
                </p>
                {rollResult.success && (
                  <p className="text-green-300 text-sm font-mono">
                    +{rollResult.steps} steps forward
                  </p>
                )}
              </div>
            )}

            {/* Results overlay (scene=2) */}
            {phase === 'results' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center
                              bg-gray-950/80 rounded-xl gap-6">
                <p className="text-gray-400 text-sm uppercase tracking-widest">
                  The run ends here
                </p>
                <p className="text-6xl font-black text-white">{streak}</p>
                <p className="text-gray-500 text-sm">
                  {streak === 1 ? 'encounter survived' : 'encounters survived'}
                </p>
                <button
                  onClick={handleReplay}
                  className="mt-2 rounded-lg bg-green-700 px-8 py-3 font-semibold
                             text-white hover:bg-green-600 transition-colors"
                >
                  Play again
                </button>
              </div>
            )}

            {/* Jaw debug */}
            <span className="absolute bottom-2 right-3 font-mono text-xs
                             tabular-nums text-green-700">
              jaw {jawOpen.toFixed(3)}
            </span>
          </div>

          {/* Encounter narration + options (scene=0 phases) */}
          {(phase === 'presenting' || phase === 'pre-rolling' || phase === 'reacting' || phase === 'greeting') &&
            encounter && (
            <div className="w-full max-w-lg space-y-4">
              <p className="text-gray-300 text-sm text-center leading-relaxed min-h-[3rem]">
                {encounter.narration}
              </p>

              {phase === 'presenting' && (
                <div className="flex flex-col gap-2">
                  {encounter.options.map((opt) => (
                    <button
                      key={opt.threshold}
                      onClick={() => handleOption(opt.threshold)}
                      disabled={isSpeaking}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800
                                 px-4 py-3 text-left text-sm text-gray-200
                                 hover:border-green-600 hover:bg-gray-700
                                 disabled:opacity-40 disabled:cursor-not-allowed
                                 transition-colors flex items-center justify-between gap-4"
                    >
                      <span>{opt.label}</span>
                      <span className="shrink-0 text-xs font-mono text-green-500">
                        {stepRange(opt.threshold)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {phase === 'reacting' && (
                <p className="text-center text-xs text-gray-600 italic">
                  {isSpeaking ? 'Speaking…' : ''}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
