# AGENTS.md — Dice Quest (working title)

> Context file for AI coding agents (Cursor, etc.). Captures the locked decisions,
> architecture, and build plan for this project. Keep this file current — it is the
> single source of truth when the chat history isn't available.

## What this is

A web app for the **Rive Interactive Character Animation Challenge** (Rive × Contra,
**June 19 – July 2, 2026**, $10K in prizes). The contest judges *how alive an
interactive character feels*. The deliverable is a chatbot-style character that leads
the player through a tiny dice-driven survival game.

**The character:** a **skeletal skull** with a hinged jaw and no lips, framed by a green
flame/aura. Because it has no lips, "lip sync" is just **jaw open/close** (see below), and
its emotional range comes from three channels — the **eye sockets** (glow colour/shape,
narrowing), the **jaw** (clenched vs. dropped-open laugh), and the **green aura** (flares
up on a win, gutters to embers on a loss). Plan win/lose around those, not a mouth.

### The one principle that overrides everything
The **Rive character is the judged artifact.** The game, the React code, and the voice
layer are the *wrapper* that gives the character reasons to emote. When trading off
effort, the character's animation quality and reaction beats win. Do not let game logic
or plumbing eat time that belongs to the character.

## Core loop

0. **Start screen** ("Begin your journey"). The opening click unlocks Web Audio, starts
   the looping music bed, and triggers the greeting (required — browsers block audio until
   a user gesture).
1. Character greets the player and sets up the journey (spoken).
2. An **encounter** is presented: the character speaks the situation; the UI shows
   **3 option buttons**, each labelled with its required roll (e.g. "Roll 5 or above").
3. Player clicks an option → switch to the **dice scene**; the **Rive d8** rolls.
4. Outcome is decided in code **first** (roll 1–8 vs. the option's threshold; success if
   `roll >= threshold`), then the dice animates to land on that exact number.
5. **Reaction beat:** switch back to the skull scene; it speaks a short reaction line
   (jaw-synced) while holding the win or lose expression:
   - Success → an **affirmative** line that bridges into the next encounter → advance.
   - Failure → a **negative** send-off line → **results scene** (game over).
6. On loss: the results scene shows the streak count and a replay button.

Run length is a survival streak. The player competes on **how long a streak they
achieve** before a failed roll ends the run.

## Locked decisions

- **Framework:** Next.js (App Router). Needed for a server route that keeps the
  ElevenLabs key off the client and handles TTS. Deploys to Vercel trivially.
- **Character:** The custom `.riv` is essential (this is a Rive character contest). Build
  the loop against a **simple throwaway test rig** (any `.riv` exposing a mouth input)
  while the real custom character is designed in parallel, then swap it in.
- **Lip sync:** DIY, driving **our own** Rive rig — NOT MascotBot. The character is a
  lipless skull, so lip sync = a **single `jawOpen` (0–1) value driven by audio
  amplitude** (jaw drops on loud sounds, closes on quiet). This is the PRIMARY and very
  likely FINAL approach — a per-phoneme viseme rig is NOT needed for a skull. (Viseme
  mouth-shapes remain a documented fallback only if a future lipped character is used.)
  See "Lip-sync pipeline".
- **Voice:** **Scripted narration via TTS** (ElevenLabs), NOT a free-form
  conversational agent. Narration is fixed, so audio can be **pre-baked** once — no
  streaming, no dead-air latency, near-zero per-play cost. Lean on ElevenLabs broadly:
  TTS-with-timestamps (audio + alignment in one call, for captions/jaw emphasis), Voice
  Design for the character's voice, and SFX generation for dice/sting sounds.
- **Player input:** Click the 3 options. Voice input is out of scope (stretch only).
- **Content model:** An **encounter pool** (roguelike-style), not a fixed linear story.

## Encounter pool model

- Build a pool of **~15–25 distinct encounters** (start ~15, expand if time allows).
- The game uses a single **8-sided die (d8)**. Each option stores a `threshold` (2–8);
  the player rolls 1–8 and succeeds if `roll >= threshold`. The die is **transparent** —
  it visibly lands on the number that justifies the outcome. Players see thresholds
  ("Roll 5 or above"), never percentages.
- Threshold → true odds: `p = (9 - threshold) / 8`.
  2→87.5%, 3→75%, 4→62.5%, 5→50%, 6→37.5%, 7→25%, 8→12.5%.
- Each encounter is data only:
  ```ts
  type Option = { label: string; threshold: number; }; // threshold 2–8; succeed if roll >= threshold
  type Encounter = {
    id: string;
    tier: number;          // difficulty tier, used to escalate
    narration: string;     // the line the character speaks
    options: [Option, Option, Option];
  };
  ```
- A run draws from the pool (shuffled), **escalating to harder tiers as the streak
  climbs**. Optionally insert scripted "milestone" beats at streak thresholds
  (e.g. 5, 10, 20) for narrative flavor without combinatorial branching cost.

### Session-length math (tune thresholds, not pool size)
A run ends on the first failed roll. If a player always picks the best (lowest-threshold)
option with success chance `p`, expected successes before busting ≈ `p / (1 - p)`. With
the d8 thresholds:
- threshold 2 (p=0.875) → ~7 moves
- threshold 3 (p=0.75)  → ~3 moves
- threshold 4 (p=0.625) → ~1.7 moves

So **session length is driven by your threshold curve**, independent of pool size. To
allow long runs, offer some low-threshold "safe" options (2+/3+); to create tension,
escalate thresholds as the streak climbs. Front-load variety in the first 60–90s so
judges see the full emotional range (idle, talk, win, lose, roll-anticipation) quickly.

## Reaction lines (narrative bridge between encounters)

After each roll resolves, the character speaks one short reaction line. These are a
**small shared pool**, NOT per-encounter — because encounters are drawn randomly, a
line must be generic enough to lead into *any* next encounter.

```ts
type ReactionLines = {
  affirmative: string[];  // ~6–8 lines; played on success, bridge into next encounter
  negative: string[];     // ~4–6 lines; played on failure, send-off before game over
};
```

Rules:
- Keep each line to **~1 sentence** so it adds flavor without dragging for a scrubbing judge.
- Pick at random, **avoiding immediate repeats** (don't play the same line twice in a row).
- Affirmative lines must bridge generically ("You made it — but it gets worse ahead…"),
  never reference a specific upcoming encounter.
- Pre-bake these like everything else (small fixed set → cheap).
- **Stretch (not MVP):** tier the affirmatives so they grow more impressed as the streak
  climbs.

## Tech stack

- **Next.js (App Router)** + TypeScript + Tailwind.
- **Rive** — character animation + dice animation + the jaw rig
  (`@rive-app/react-canvas` or current runtime). Use `useStateMachineInput` to drive the
  `jawOpen` and expression inputs from JS.
- **ElevenLabs** — TTS for narration (server-side key). Use the **with-timestamps** TTS
  endpoint so one call returns audio + character/word alignment (alignment powers captions
  and optional jaw emphasis; the jaw itself runs off amplitude). Also: Voice Design for the
  skull's voice, SFX generation for dice/stings.
- **Lip sync (DIY, no MascotBot) — jaw amplitude:** a Web Audio `AnalyserNode` reads the
  playing clip's volume each frame and drives the single `jawOpen` (0–1) input. That's the
  whole pipeline for a skull. (FALLBACK ONLY, not planned: a `{ viseme, timeMs }[]` timeline
  over ~8–12 mouth-shape states — relevant only if a lipped character is ever used.)
- **Vercel** — hosting.
- **UI & fonts** — keep the HTML/React chrome (start screen, option buttons, streak
  counter, captions) deliberately minimal; it's a frame around the persistent `.riv`.
  Drive all chrome styling through **design tokens** (CSS variables for font family, key
  colours, spacing) and small contained components from Phase 1 onward, so the Phase 3
  styling pass is editing a few tokens, not hunting inline styles. Custom fonts via
  **`next/font`** (`/local` for owned/licensed files, `/google` by name) — self-hosts,
  avoids layout-shift flicker; confirm webfont licence before shipping. NOTE: `next/font`
  styles React text only; text rendered *inside* the `.riv` uses fonts embedded in the
  Rive editor — so keep as much text as possible in the React layer and let Rive do art,
  not type.

## Lip-sync pipeline (skull = jaw amplitude)

The character is a lipless skull, so lip sync is one value: `jawOpen` (0–1).

On playback, run a Web Audio `AnalyserNode` on the playing clip. Each animation frame:
compute RMS volume → normalize to 0–1 → apply light smoothing (so the jaw glides, not
jitters) → set the `jawOpen` Rive input. Ease back to 0 when audio ends. Tunable params:
gain, smoothing factor, max-open clamp. That is the entire pipeline — no timing data, no
per-phoneme states, works with any audio.

Optional polish (not required): use the ElevenLabs **with-timestamps** alignment (returned
in the same TTS call) to add a touch of extra jaw emphasis on stressed syllables, and to
render synced **captions** (valuable for judges scrubbing on mute). The jaw still runs off
amplitude; alignment is additive.

Because narration is a fixed set, the audio clips can be **pre-baked** and shipped as
static assets — no runtime TTS dependency at play time.

> FALLBACK ONLY (not planned, kept for reference): for a *lipped* character you would
> instead drive a `mouth` number input across ~8–12 viseme states from a
> `{ viseme, timeMs }[]` timeline derived from the actual ElevenLabs clip (character
> timestamps → viseme map, or Rhubarb offline). Not needed for the skull.

## Rive file architecture (ONE persistent .riv)

The whole experience lives in a **single persistent `.riv`** loaded once and kept mounted
for the entire session — no swapping files between scenes. Structure:

- **One main artboard** with a top-level state-machine layer driven by a `scene` input
  (number/enum): `playing` (skull narrating + choosing) → `rolling` (dice) → `results`
  (win/lose screen). The skull is NOT kept on screen during the roll — treat the three as
  **separate scenes** the parent switches between.
- **Each scene is a nested artboard** with its own internal state machine:
  - *Skull artboard* — the Phase 0 jaw rig (`jawOpen`) + idle + win/lose expressions.
  - *Dice artboard* — the d8 (`roll` trigger + `result` 1–8).
  - *Results artboard* — `outcome` (win/lose) driving aura-flare / ember effects.
- **Expose a flat input surface at the top level** (`scene`, `jawOpen`, `roll`, `result`,
  `outcome`) and let the parent state machine forward values down into the nested
  artboards. React talks to ONE flat set of inputs and never reaches deep into nested
  machines.
- **Default/placeholder states first:** before any polish, each scene must EXIST as a
  crude switchable state — working skull, a static "DICE" box, and flat green WIN / red
  LOSE frames — so the container is real and `scene`-switching is proven from code. Ugly
  is correct at this stage; we're validating the container, not the art.

### Audio model (independent of Rive scenes)
Audio lifecycle is SEPARATE from scene state — never tie the music bed to Rive scenes or
it will cut/restart on every switch.
- **Music bed:** one looping track, owned by the **React/Web Audio layer**, started once
  when the run begins and played continuously across all scene switches until game-over.
  NOT inside the `.riv`.
- **One-shot SFX** (dice clatter, win/lose sting): trigger from React, or use Rive audio
  events inside the relevant nested artboard when the sound is tightly bound to an exact
  animation frame (e.g. the die landing). Keep the bed in React regardless.
- **Browser autoplay rule:** a `.riv` (or any web audio) CANNOT auto-play sound on load —
  browsers block audio until a user gesture. So gate all audio behind the opening click.
  Use an explicit **start screen** ("Begin your journey") whose click both unlocks the
  Web Audio context / starts the bed AND kicks off the skull's greeting.

## Rive state-machine contract — skull artboard (IMPORTANT)

Build the test rig AND the custom skull to the **same input contract** so the custom
skull artboard is a drop-in swap. Required inputs/states:

- `idle` — breathing/idle loop (subtle skull bob, flickering aura, eye-glow pulse). The
  character is **never frozen**; idle plays whenever not speaking or reacting.
- `jawOpen` — single number input (0–1) driving the jaw, set from audio amplitude. (No
  viseme states; the skull has no lips.)
- `win` — success reaction: aura flares up, eye sockets brighten/narrow, jaw drops into a
  laugh.
- `lose` — failure reaction: aura gutters to embers, eye glow dims/goes out, jaw clenches.
- `rollAnticipation` (optional) — beat before the dice resolves.

During the reaction beat the character is **talking (jaw moving) AND holding win/lose** at
once, so these must compose: keep `jawOpen` on its own state-machine layer so amplitude
drives the jaw while a separate layer holds the eye/aura expression.

The rig is **fully ours** — no external spec to conform to.

The **dice** is the *dice nested artboard* (see Rive file architecture above): a d8 with a
`roll` trigger + a `result` input carrying the landed number (1–8). Code decides the
outcome first, then drives the die to land on that number. Rive is a 2D tool, so do NOT
attempt a realistic 3D octahedron tumble — animate a **stylized 2D shake-and-reveal** that
settles on a clearly legible 1–8. Transparency comes from that readable number sitting next
to the option's requirement ("needed 5+"), not from physical realism. (Eight number states
+ the octahedron silhouette = a bit more art than a cube; Phase 2 task.)

## Build plan (phases)

- **Phase 0 (Day 1) — Scaffold + de-risk.** Next.js project + ElevenLabs key. Make a
  throwaway test `.riv` with a `jawOpen` input. THE spike: a line of text → ElevenLabs
  TTS-with-timestamps (via a server route) → play the audio while a Web Audio analyser
  drives `jawOpen` so the jaw moves in time, resting closed when silent. Nothing else
  until this works.
- **Phase 1 (Days 2–4) — Playable loop in the persistent .riv (placeholder art).** Build
  the single persistent `.riv` with the three nested-artboard scenes (skull / dice /
  results) as crude placeholder states, switchable via the top-level `scene` input. Wire
  the start screen (unlocks audio + music bed). Encounter + reaction-line data models;
  pure-TS game logic in `/lib/game` (pickEncounter, resolveRoll, pickReaction). React loop
  state: start → presenting → resolving → reacting → (presenting | results), driving
  `scene` and the skull's `jawOpen` alongside narration playback. 3 threshold-labeled
  buttons ("Roll N or above"); reaction line after each roll; placeholder dice shows the
  rolled 1–8 vs the requirement; results scene shows streak + replay. Keep UI ugly but
  route its styling through design tokens (CSS vars) + small components now — no visual
  polish yet, just the cheap structure that makes the Phase 3 styling pass painless.
- **Phase 2 (Days 5–8) — Real dice + reactions + "alive" polish.** Flesh out the nested
  artboards: real d8 shake-and-reveal synced to the computed outcome; skull win/lose
  expressions (eye-glow/aura/jaw) composing over the moving jaw; results-scene aura-flare /
  ember effects. Obsess over the gaps between beats.
- **Phase 3 (Days 6–10, parallel) — Custom skull polish + writing + UI skin.** Finish the
  custom skull artboard to the contract above (jaw rig + eye/aura expression layers); write
  the encounter pool with real personality; final TTS bake (Voice Design the skull's voice).
  **UI styling pass:** apply the real layout, custom fonts (`next/font`), and colours by
  filling in the design tokens set up in Phase 1 — done here so UI skin and character art
  share one visual direction.
- **Phase 4 (Days 11–13, Day 14 buffer) — Deploy + submit.** Deploy to Vercel (Hobby tier
  fine for a non-commercial contest entry); audio is pre-baked static assets so no runtime
  ElevenLabs key is needed. Optional shared leaderboard (lightweight storage, no accounts).
  Record a demo clip (judges scrub). Submit per Contra `#rivechallenge` guidelines with the
  live link.

## Scope guardrails (do NOT build unless explicitly reprioritized)

- No voice input / speech-to-text.
- No free-form conversational agent.
- No user accounts / auth.
- No real-time multiplayer (a simple shared score leaderboard is the only multiplayer).
- No deep branching narrative trees (encounter pool + optional milestone beats only).

## Character bible (FILL IN — highest-leverage creative work)

The contest is about *engaging characters*; a generic mascot loses to a weaker stack
with a strong character. Define before writing encounters:
- Who they are / the world they're in: a skeletal skull wreathed in green flame — a
  taunting dice-master who toys with the player (tone/backstory TBD).
- How they talk (voice, vocabulary, verbal tics): TBD — lean theatrical-villain; craft via
  ElevenLabs Voice Design (hollow, raspy).
- What they want: TBD.
- How they react on a WIN (aura flares, eyes brighten, jaw-drop laugh): TBD wording.
- How they react on a LOSS (aura gutters to embers, eyes dim, jaw clenches): TBD wording.
