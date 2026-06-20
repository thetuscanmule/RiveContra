import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { text } = await request.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return NextResponse.json(
      { error: 'ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set in .env.local' },
      { status: 500 }
    );
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ text, model_id: modelId, voice_settings: { speed: 0.7 } }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('ElevenLabs error:', res.status, err);
    return NextResponse.json({ error: 'TTS request failed', detail: err }, { status: 502 });
  }

  // Response shape:
  // {
  //   audio_base64: string,           // MP3, base64-encoded
  //   alignment: {
  //     characters: string[],
  //     character_start_times_seconds: number[],
  //     character_end_times_seconds: number[],
  //   },
  //   normalized_alignment: { ... }   // same shape, normalized text
  // }
  const data = await res.json();

  console.log('[/api/speak] alignment chars:', data.alignment?.characters?.length ?? 0);

  return NextResponse.json({
    audio: data.audio_base64,
    alignment: data.alignment,
    normalizedAlignment: data.normalized_alignment,
  });
}
