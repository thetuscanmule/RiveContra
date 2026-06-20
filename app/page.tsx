'use client';
import { useState, useRef, useCallback } from 'react';
import { SkullCanvas } from '@/components/SkullCanvas';

// Amplitude → jaw tuning params
const GAIN = 7;          // boost quiet speech into visible jaw movement
const SMOOTHING = 0.72;  // 0 = instant, 1 = never moves — 0.72 gives a nice glide
const MAX_JAW = 0.95;    // never fully slam open

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export default function Home() {
  const [text, setText] = useState('');
  const [jawOpen, setJawOpen] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef(0);

  const stopLoop = () => cancelAnimationFrame(rafRef.current);

  const easeJawClosed = useCallback(() => {
    stopLoop();
    const ease = () => {
      smoothedRef.current *= 0.82;
      setJawOpen(smoothedRef.current);
      if (smoothedRef.current > 0.005) {
        rafRef.current = requestAnimationFrame(ease);
      } else {
        setJawOpen(0);
        smoothedRef.current = 0;
        setSpeaking(false);
      }
    };
    ease();
  }, []);

  const handleSpeak = useCallback(async () => {
    if (!text.trim() || speaking) return;
    setError('');
    setSpeaking(true);
    stopLoop();

    let data: { audio: string; alignment: unknown; normalizedAlignment: unknown };
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      data = await res.json();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      setSpeaking(false);
      return;
    }

    // Log alignment for Phase 1 captions / per-phoneme emphasis
    console.log('[jaw-sync] alignment:', data.alignment);
    console.log('[jaw-sync] normalizedAlignment:', data.normalizedAlignment);

    const audioBuffer = base64ToArrayBuffer(data.audio);

    // Create / reuse AudioContext — must happen inside a user-gesture handler
    let ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext();
      audioCtxRef.current = ctx;
    }
    if (ctx.state === 'suspended') await ctx.resume();

    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(audioBuffer);
    } catch {
      setError('Failed to decode audio — check ElevenLabs response');
      setSpeaking(false);
      return;
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    const dataArr = new Uint8Array(analyser.frequencyBinCount);

    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    source.start();

    // RAF loop: RMS → smooth → jawOpen
    const tick = () => {
      analyser.getByteTimeDomainData(dataArr);
      let sumSq = 0;
      for (let i = 0; i < dataArr.length; i++) {
        const v = (dataArr[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / dataArr.length);
      const clamped = Math.min(rms * GAIN, MAX_JAW);
      smoothedRef.current = smoothedRef.current * SMOOTHING + clamped * (1 - SMOOTHING);
      setJawOpen(smoothedRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    source.onended = () => easeJawClosed();
  }, [text, speaking, easeJawClosed]);

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-xl font-semibold tracking-widest text-green-400 uppercase">
        Skull · Phase 0 · Jaw Sync
      </h1>

      <div className="relative">
        <SkullCanvas jawOpen={jawOpen} />
        <span className="absolute bottom-2 right-3 font-mono text-xs tabular-nums text-green-700">
          jaw {jawOpen.toFixed(3)}
        </span>
      </div>

      <div className="flex w-full max-w-lg gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSpeak()}
          placeholder="Type something for the skull to say…"
          disabled={speaking}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-green-600 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSpeak}
          disabled={speaking || !text.trim()}
          className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {speaking ? 'Speaking…' : 'Speak'}
        </button>
      </div>

      {error && (
        <p className="max-w-lg text-center text-sm text-red-400">{error}</p>
      )}

      <p className="max-w-sm text-center text-xs text-gray-600">
        Jaw = live RMS amplitude via Web Audio AnalyserNode.
        Character alignment logged to console for Phase 1 captions.
      </p>
    </main>
  );
}
