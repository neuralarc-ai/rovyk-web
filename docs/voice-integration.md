# Voice on the marketing site — research notes

Status: **research only, nothing implemented.** Written August 2026, before any
provider was chosen. Prices and browser support drift — re-check anything here
before spending money on it.

The question this answers: how do we put a *good* voice on rovyk-web, given
that the product is a voice agent and the hero is a scripted spoken exchange.

---

## 1. What the reference prototype does, and why it isn't good enough

`docs/references/rovykpage_9.html` (~line 1440) uses the browser's built-in
**Web Speech API** (`speechSynthesis`) with a hardcoded preference list —
`Serena`, `Kate`, `Karen`, `Moira`, … falling back to any `en-GB` voice.

Two problems:

1. **You get whatever the visitor's OS ships.** A Mac gives Serena, Windows
   gives Microsoft Sonia, Chrome on Linux gives something much worse. Many of
   these are optional OS downloads, so even two Macs can differ. The voice is
   the product's personality and we do not control it at all.
2. **Audio and text are unrelated.** `typeInto()` runs at a fixed 36ms/25ms per
   character regardless of what the voice is doing, so they drift apart
   immediately. It reads as two animations running side by side rather than one
   thing speaking.

Both are fixed by the approach below.

---

## 2. The decision that drives everything else

**Pre-render the audio at build time. Do not call a TTS API at runtime.**

The hero copy is fixed — the question and the answer never change. Generating
that audio per page load means:

| | Pre-rendered static file | Live API per visit |
|---|---|---|
| Cost @ 100k visits | ~$0.02, one time | ~$2,200 (220 chars × 100k × $0.10/1k) |
| Latency to first sound | 0ms (preloaded) | 300–800ms + network |
| Needs API key / server route | No | Yes, proxied |
| Fails if provider is down | No | Yes |
| Quality ceiling | Highest — regenerate until perfect | Whatever comes back |

There is no upside to live TTS for fixed copy. Generate once, listen, tweak,
regenerate, commit the MP3. A 12-second mono MP3 at 64kbps is ~96KB — cheaper
than most hero images.

Live TTS only earns its keep if we later add genuinely dynamic input ("type
your own command and hear Rovyk answer"). Worth keeping that door open in the
plumbing; not worth paying for now.

---

## 3. Provider comparison

| Provider | Price | Notes |
|---|---|---|
| **ElevenLabs** | $0.10/1k chars (v2/v3), $0.05 Flash | Expressiveness leader, 5,000+ voices. **Has a character-level timestamps endpoint** — see §4. |
| **Cartesia Sonic 3.6** | ~$49/1M chars | ~40–90ms time-to-first-audio (irrelevant for pre-rendered). Currently leads the Artificial Analysis speech arenas. |
| **OpenAI `gpt-4o-mini-tts`** | ~$15/1M chars | Cheapest of the three. Conversational quality, a step below the specialists. |
| **Hume** | — | The empathy / emotional-inflection angle, if the voice should feel warm rather than precise. |

**Recommendation: ElevenLabs**, specifically for the timestamps endpoint.

### Licensing (checked carefully — this one matters)

- **Free plan has no commercial rights.** You must attribute ElevenLabs by
  putting "elevenlabs.io" in the title of published content. Non-starter for a
  marketing site.
- **Creator plan ($22/mo)** includes a commercial licence with no attribution.
- **Rights to generated audio are perpetual** — they survive cancelling the
  subscription. So this is realistically *one month* of subscription: generate
  the hero audio, keep the rights, cancel.

---

## 4. Why timestamps are the whole trick

This is what turns a decent section into a memorable one.

`POST /v1/text-to-speech/:voice_id/with-timestamps` returns the audio **plus**
an alignment array giving the exact millisecond each character is spoken. There
is also a **Forced Alignment** endpoint that does the same for audio you
already have (useful if we ever record a human).

With that JSON committed next to the MP3, text stops revealing at a made-up
fixed speed and instead **each word illuminates at the moment the voice says
it**. When Rovyk pauses mid-sentence the text pauses; when it accelerates the
text accelerates. That coupling is what makes it read as one thing speaking.

Costs nothing at runtime — it is a static JSON file, a few KB.

Relevant endpoints:
- `/v1/text-to-speech/:voice_id/with-timestamps` (non-streaming)
- `/v1/text-to-speech/:voice_id/stream/with-timestamps` (streaming)
- `/v1/forced-alignment` (align existing audio to a transcript)

---

## 5. On-device TTS in the browser — evaluated and rejected (for the hero)

Tempting idea: the Mac app bundles **Supertonic** for on-device TTS, and
Supertonic ships an official browser build running through ONNX Runtime Web
with WebGPU. Running *the same voice model the product uses*, locally in the
visitor's browser, with no server, is an extremely on-message demo for a
local-first product.

Actual weights, checked on Hugging Face:

| Model | ONNX total | Breakdown |
|---|---|---|
| `Supertone/supertonic` (v2) | **~262 MB** | vector_estimator 132MB, vocoder 101MB, text_encoder 27MB, duration_predictor 1.5MB |
| `Supertone/supertonic-3` | **~398 MB** | vector_estimator 257MB, vocoder 101MB, text_encoder 36MB |

No quantized web build is published. That is disqualifying for a hero section.

**Kokoro.js** is the lighter alternative — 82M params, ~86MB at q8, WASM/WebGPU
via Transformers.js — but 86MB is still ~30× a normal page budget.

**Where this idea does belong:** an opt-in panel further down the page — "run
the voice on your own machine, the way the app does" — with an explicit
download-and-run button that states the model size honestly. Visitors who care
about the local-first claim get to *verify* it in their own browser. That is a
trust-building moment and fits the "no black box" framing. Just not in the
first five seconds.

Licensing note: Supertonic weights are **OpenRAIL-M**, sample code is MIT.
Read the actual LICENSE file before shipping anything based on it.

---

## 6. Should the site listen to the visitor?

Two options:

- **Web Speech API `SpeechRecognition`** — free, no key. Chrome/Edge/Opera full
  support; Safari 14.1+ via `webkitSpeechRecognition` (and can run on-device);
  **Firefox has it behind an about:config flag, off by default** — so Firefox
  users get nothing.
- **ElevenLabs Agents widget** — a real conversational agent embedded on the
  page. ~$0.08–0.10/minute, free tier is 15 minutes *total*. At any real
  traffic level this gets expensive fast, and it is abusable by anyone who
  wants to run up the bill.

**Recommendation: no live mic in the hero.** Two reasons:

1. A microphone permission prompt in the first three seconds is a hostile first
   impression — asking for trust before earning any.
2. The product's pitch is *agency, not chat*. The interesting thing is not that
   it hears you, it is that it operates your Mac. A mic demo on a website can
   only ever demo the boring half.

If we want the visitor's voice involved at all, put it well below the fold,
after the value prop lands, behind an explicit "try it" button.

---

## 7. Constraints the design must respect

- **Audio cannot autoplay.** Muted autoplay is always allowed; unmuted depends
  on Chrome's Media Engagement Index and Safari's interaction history, and
  **iOS Safari blocks autoplay-with-sound outright**. Sound is always opt-in
  via a click.
- **The section must be fully beautiful silently.** Most visitors will never
  press the button. Sound is an enhancement, never the payload.
- Preload the MP3 on first pointer/scroll so there is no gap when they click.
- Persist the choice in `localStorage` — don't make them ask twice.
- Respect `prefers-reduced-motion` on the audio path too, not just animation.
- Ship real captions, not decorative text — for deaf visitors and for SEO.
- Same-origin static audio means no CORS obstacle to reading its waveform with
  a Web Audio `AnalyserNode`.

---

## 8. Proposed plumbing (four small pieces)

1. **`scripts/voice/generate.ts`** — takes a manifest of `{ id, text }`, calls
   ElevenLabs `/with-timestamps`, writes `public/voice/<id>.mp3` +
   `<id>.json`. Run manually, commit the output. The API key lives in
   `.env.local` and never reaches the client.
2. **`useVoiceTrack` hook** — loads the MP3 + alignment; exposes `play()`,
   `stop()`, live `amplitude`, and `spokenChars`. One `AudioContext`, created
   lazily on the user gesture.
3. **`<SpokenText>`** — takes the alignment and reveals words in time with the
   voice; falls back to fixed-speed timing when muted.
4. **`<HeroOrb>`** — already built, see below.

Every piece works with sound off. Turning sound on just swaps the clock from
`setInterval`/GSAP to the audio element.

---

## 9. Seams already built into the current section

The intro section (`components/intro-section.tsx`) was written so this drops in
without a rewrite:

- **The reply reveals word by word, not character by character.** Each word is
  its own `[data-word]` span. That is deliberately the exact granularity
  per-word timestamps will drive — swapping the GSAP stagger for alignment
  data is a local change.
- **`components/hero-orb.tsx` takes an `amplitude` prop** (0–1, currently
  always 0). Feeding it live RMS from an `AnalyserNode` makes the orb ride the
  waveform of the reply instead of looping beside it.
- The orb's tuning knobs are real and were verified against the library:

  ```
  listening → wave   { rings: 9, rBase: 0.6,   rDepth: 1.7,  speed: 4.39 }
  composing → ribbon { lanes: 3, bandMul: 3.9, wobMul: 1,    speed: 2.34 }
  ```

  Drive `rDepth` from amplitude while listening and `bandMul`/`wobMul` while
  speaking. (`thinking-orbs` only ships sizes 64 and 20; the hero renders via
  the `thinking-orbs/engine` escape hatch, which accepts arbitrary size and
  opts — see the comment at the top of `hero-orb.tsx`.)
- **The `Replay` button is the natural home for the sound toggle.** It becomes
  "Play with sound" once there is sound to play.

With all three layers — voice, text, orb — driven by one clock (the audio
itself), the section becomes a single coherent performance.

---

## 10. Open questions before implementing

1. **Voice character.** The brief positions Rovyk as a power-user tool with a
   confirmation gate before anything destructive — that suggests calm, precise,
   slightly dry. Not warm-assistant, not hype. Shortlist 3–4 ElevenLabs voices
   reading the actual hero copy and pick by ear.
2. **Is the ElevenLabs subscription available?** If not, `gpt-4o-mini-tts` is
   the fallback — cheaper, no timestamps, so we lose word-sync and fall back to
   estimated timing. Materially worse, but workable.
3. **Lock the copy before generating.** Regenerating means re-listening to
   every candidate again.

---

## Sources

- [ElevenLabs — timestamps endpoints](https://elevenlabs.io/blog/new-text-to-speech-endpoints-with-timestamps)
- [ElevenLabs — Forced Alignment](https://elevenlabs.io/docs/overview/capabilities/forced-alignment)
- [ElevenLabs — API pricing](https://elevenlabs.io/pricing/api)
- [ElevenLabs — publishing rights / attribution](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform)
- [ElevenLabs — Agents pricing](https://elevenlabs.io/pricing/agents)
- [TTS provider comparison, 2026](https://futureagi.com/blog/best-text-to-speech-providers-2026/)
- [OpenAI TTS pricing](https://texttolab.com/blog/openai-tts-pricing)
- [Supertonic — browser demo](https://github.com/supertone-inc/supertonic/tree/main/web)
- [Supertonic — weights](https://huggingface.co/Supertone/supertonic)
- [kokoro-js](https://www.npmjs.com/package/kokoro-js)
- [MDN — SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay)
