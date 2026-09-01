# Voice narration — asset production brief

Status: **decided, awaiting assets.** This document is the contract between
the person generating the audio and the person building the delivery system.
Everything in it has been agreed; nothing here is a proposal.

Companion document: [`voice-integration.md`](./voice-integration.md) is the
research trail that got us here (provider comparison, licensing, why not
on-device TTS, why no live mic). Read it if you want the reasoning. This
document is what you build from.

**If you are the developer generating the MP3s, you can work entirely from
sections 2 through 9.** Sections 0, 1 and 10 are context and handoff.

---

## 0. What is being built, in one paragraph

Voice mode. A visitor presses a small tab in the top-right of the page chrome
labelled `HEY ROVYK`; it wakes, and from then on it narrates the page as they
scroll, one section at a time, in Rovyk's own first person. Each section has a
purpose-written script rather than a read-aloud of the copy, because the whole
premise of the product is that it tells you more than you asked for. A caption
under the tab lights word by word in time with the voice, driven by
per-word timestamps generated alongside the audio.

The visual design is finished and can be seen running here:
**https://claude.ai/code/artifact/8914fa20-1169-4a49-b1fa-1083eab65a55**

---

## 1. Division of work

| | Owner | Deliverable |
|---|---|---|
| **Audio production** | the generating dev | `scripts/voice/`, `public/voice/*`, and nothing else |
| **Delivery system** | separate, after the assets land | the HUD component, scroll tracking, caption rendering, orb coupling |

**Do not touch `components/`, `lib/`, `app/` or `docs/`.** The delivery work
is already specced against those files and a merge conflict there costs more
than it saves. If something in this document is wrong or impossible, say so
rather than working around it in app code.

The two halves are deliberately independent: the delivery system is being
built against synthetic timings, so it does not block on these assets and
these assets do not block on it.

---

## 2. The deliverable, as a file tree

```
scripts/voice/
  manifest.json          ← input. Hand-authored from §9 of this document.
  generate.ts            ← your generator. Run manually, never in CI.

public/voice/
  index.json             ← output. Every track, its hash, duration and size.
  intro.reply.mp3
  intro.reply.json
  hero.brief.mp3
  hero.brief.json
  hero.dwell.mp3
  hero.dwell.json
  ...                    ← 21 tracks in total, see §9
```

Both directories are committed to the repo. The MP3s are static assets served
from the same origin; there is no CDN step and no server route.

**Total budget:** 21 tracks, roughly 5,000 characters. At $0.10 per 1,000
characters that is about **$0.50 per complete regeneration**, and roughly
**2.5 MB** of committed audio at the encoding below. Both are fine. Regenerate
freely until it sounds right.

### Track ID grammar

```
<sectionId>.<tier>
```

Lowercase, dot-separated, no spaces, no underscores. `sectionId` matches the
`id` attribute of the section on the page (`where`, `features`, `how`, `orb`,
`uses`, `safe`, `req`, `faq`, `cta`), plus `hero` and `intro`, which are the
two that do not currently carry one. The tiers are:

- **`brief`** — plays when the visitor settles in the section. Every section
  that speaks has one.
- **`dwell`** — plays only if they are *still there* six seconds after the
  brief ends. This is where the script is allowed to admit a limitation.
  Most visitors never hear these.
- **`skip`** — plays only if they scroll past the section at speed. Two exist
  on the whole page, deliberately.
- **`reply`** — one track only, `intro.reply`. Not narration; it is the hero
  splash's existing spoken line, which becomes real audio.

The filename is the track ID plus the extension. Nothing else.

---

## 3. Audio specification

| | Value |
|---|---|
| Container / codec | MP3 |
| Channels | Mono |
| Sample rate | 44,100 Hz |
| Bitrate | 64 kbps CBR |
| ElevenLabs `output_format` | `mp3_44100_64` |

**Commit exactly the bytes the API returns. Do not post-process.**

This is not fussiness. The alignment JSON in §4 carries absolute millisecond
timings into the audio, so anything that changes the file's length or start
point silently desynchronises every caption in that track. In particular:

- **Do not trim leading or trailing silence.** The delivery system handles
  head silence; a trim would shift every timestamp by an unrecorded amount.
- **Do not normalise, compress or EQ.** If two tracks differ in loudness,
  regenerate them with matched voice settings rather than fixing it after.
- **Do not re-encode, resample or convert.** Ask the API for the format above
  and commit what comes back.

If a gain-only adjustment ever becomes genuinely necessary, it is the one
edit that is safe (it changes no timing), but flag it in the PR so the
delivery side knows the files are not raw.

---

## 4. Alignment JSON — one file per track

ElevenLabs returns **character-level** timings. We commit **word-level and
sentence-level**, converted at generation time, because that is what the
client actually consumes and shipping the character array would be several
times larger for no benefit.

### Committed shape

```jsonc
{
  "id": "where.brief",
  "text": "I default to the notch because most of what you ask takes a few steps and no reading. …",
  "textSha256": "3f6a…",          // sha256 of `text`, hex, lowercase
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "modelId": "eleven_multilingual_v2",
  "generatedAt": "2026-09-01T10:22:31Z",
  "durationMs": 14820,

  "words": [
    { "w": "I",       "s": 260,  "e": 402  },
    { "w": "default", "s": 402,  "e": 812  },
    { "w": "to",      "s": 812,  "e": 918  }
    // …
  ],

  "sentences": [
    { "start": 0,  "end": 17, "s": 260,  "e": 6120  },
    { "start": 17, "end": 31, "s": 6420, "e": 11040 }
  ],

  "envelope": { "fps": 30, "peak": [0, 0.04, 0.19, 0.51, 0.62, …] }
}
```

### Field rules

- **`words[].s` / `.e`** — integer **milliseconds**, not seconds. The client
  compares them against `audio.currentTime * 1000`; integers avoid float
  drift and halve the file size.
- **`words[].w`** — the word **exactly as it appears in `text`**, punctuation
  attached (`"reading."`, `"work,"`). The caption renders these verbatim, so
  a stripped comma is a visible bug. Joining every `w` with single spaces
  must reproduce `text` character for character. Assert this in the generator.
- **`sentences[].start` / `.end`** — **indices into `words`**, half-open
  (`start` inclusive, `end` exclusive). This is what lets the caption window
  advance a sentence at a time rather than mid-phrase.
- **`sentences[].s` / `.e`** — milliseconds, for convenience: the start of the
  first word and the end of the last.
- **`durationMs`** — the true decoded duration of the MP3, not the last word's
  end time. Read it from the file.
- **`textSha256`** — the drift guard. If someone edits a script in this
  document and forgets to regenerate, this is what catches it.

### Converting characters to words

1. Take `alignment.characters`, `alignment.character_start_times_seconds` and
   `alignment.character_end_times_seconds` from the API response. Use
   `alignment`, **not** `normalized_alignment` — the normalised version maps
   to text ElevenLabs rewrote internally, which will not match our captions.
2. Walk the characters. A run of non-whitespace characters is one word.
3. `s` = start time of the run's first character; `e` = end time of its last.
   Convert to milliseconds and round to the nearest integer.
4. A sentence ends after any word whose final character is `.`, `!` or `?`.
   The scripts in §9 contain no abbreviations, decimals or ellipses, so this
   naive rule is correct for every one of them. If you add a script that
   breaks it, the rule changes, not the data.

---

## 5. The amplitude envelope

`envelope.peak` is what makes the little orb in the HUD ride the voice instead
of looping beside it. Committing it as data means the client needs no
`AudioContext`, no `AnalyserNode` and no decode pass, and behaves identically
in every browser.

- **30 frames per second**, so `peak[i]` covers `i * 33.3ms`.
- Each value is **0 to 1**, normalised so the loudest frame in the track is
  `1.0`. Round to two decimals; the precision is not needed and doubles the
  file size.
- Length is `ceil(durationMs / 33.3)`.

Recipe, if you want one:

```bash
ffmpeg -i where.brief.mp3 -ac 1 -ar 8000 -f s16le -
```

8,000 Hz over 30 fps is 267 samples per frame. Take the RMS of each 267-sample
window, then divide the whole array by its own maximum.

**This is required but not blocking.** If the envelope is missing or malformed
the delivery system falls back to a synthetic wobble, which looks fine and is
simply less honest. Do not hold up a batch over it.

---

## 6. `public/voice/index.json`

One generated file listing everything. It is both the manifest the client
fetches and the lock file that catches drift.

```jsonc
{
  "generatedAt": "2026-09-01T10:22:31Z",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "modelId": "eleven_multilingual_v2",
  "outputFormat": "mp3_44100_64",
  "tracks": {
    "where.brief": { "textSha256": "3f6a…", "durationMs": 14820, "bytes": 118432 },
    "where.dwell": { "textSha256": "9c11…", "durationMs": 11960, "bytes": 95664 }
    // …one entry per track
  }
}
```

Rewrite it in full on every run. Partial updates are how a stale entry
survives a regeneration.

---

## 7. The generator

`scripts/voice/generate.ts`. Run by hand, output committed. Never in CI, and
never at request time — there is no server route in this project and this
feature must not introduce one.

### Input

`scripts/voice/manifest.json`, hand-authored from §9:

```jsonc
{
  "voiceId": "…",
  "modelId": "eleven_multilingual_v2",
  "voiceSettings": { "stability": 0.5, "similarity_boost": 0.75, "style": 0.0 },
  "tracks": [
    { "id": "where.brief", "text": "I default to the notch because …" },
    { "id": "where.dwell", "text": "The window isn't the lesser surface. …" }
  ]
}
```

Copy the `text` values **verbatim** from §9, including punctuation. They are
hashed; a smartened quote or a stray double space is a diff.

### Endpoint

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps
xi-api-key: $ELEVENLABS_API_KEY
```

Body: `{ text, model_id, voice_settings, output_format: "mp3_44100_64" }`.

The response carries `audio_base64` and `alignment`. Decode the audio to
`public/voice/<id>.mp3`; convert the alignment per §4 into
`public/voice/<id>.json`.

Verify the endpoint shape against the current ElevenLabs docs before writing
against it — this brief was written from documentation that may have moved.

### Key handling

`ELEVENLABS_API_KEY` lives in `.env.local`, which is gitignored. It is a
build-time secret and must never appear in a `NEXT_PUBLIC_` variable, a
committed file, or any code under `app/` or `components/`. If it ends up in
the client bundle it is a leaked key, not a bug.

### Behaviour

- **Skip unchanged tracks.** Hash the text, compare against `index.json`, and
  only call the API for tracks whose hash differs or whose files are missing.
  A full regeneration should cost nothing when nothing changed.
- **`--force <id>` to regenerate one track anyway** — you will want this while
  auditioning a line that reads badly.
- **Fail loudly.** A non-200, a missing alignment, or a word list that does not
  rejoin into `text` should abort the run and leave existing files untouched.
  Half-written assets are worse than none.

---

## 8. Choosing the voice

The one judgement call in this brief, and it matters more than anything else
here. Audition **the actual script text**, not the library's sample sentence.
Use this one, which is the hardest line in the set to read well:

> Eight gigabytes runs me. Sixteen is where I stop being slow. And if you're on
> an Intel Mac, this is the section where you find out I can't help you, which
> I'd rather you learned here than after the download.

**What we want:** calm, precise, slightly dry. It is a tool talking to a power
user, not a brand talking to a customer. Under-perform rather than over-perform
every line. The reference prototype leaned British (Serena, Kate, Moira) and
that instinct was right.

**What we do not want:** warm assistant, upbeat, breathy, salesy, or anything
that sounds like it is smiling. The product's argument is trustworthiness; a
voice that oversells undoes the copy.

**Judge on laptop speakers**, not headphones. That is what most visitors have,
and voices that sound intimate on headphones often sound thin there.

There is one further consideration worth knowing: the Mac app itself speaks
through a bundled on-device model (Supertonic). A site voice that is wildly
different from the app's is a small letdown at install, for exactly the
sceptical audience this targets. Prefer a voice that could plausibly be the
same character.

**Then set `voiceId` in `manifest.json` and tell the team what you picked.**
Once tracks are generated, changing the voice means regenerating all 21, so it
is worth an extra twenty minutes now.

### Licensing, before you spend anything

- The **free plan carries no commercial rights** and requires "elevenlabs.io"
  in the title of published content. Unusable here.
- **Creator ($22/mo) or above** includes a commercial licence with no
  attribution.
- **Rights to generated audio are perpetual** and survive cancellation. This is
  realistically one month of subscription.

Confirm the account is on a paid tier before generating anything we intend to
ship.

---

## 9. The scripts

**These are the source of truth.** Copy them character for character.

Rewritten in full in September 2026. The first set was wordier and colder:
it wound up before saying anything, teased answers instead of giving them,
and in one section talked down its own capability. These are shorter, warmer
and first-person — Rovyk introducing itself to a reader rather than reciting
specifications at them.

Seven rules they follow, listed so that edits stay in voice:

1. **Never read the page.** Every script starts where the visible copy stops.
2. **One checkable thing per track** that is not on screen.
3. **It is Rovyk speaking, to you.** First person, contractions, warm but
   never chirpy. No exclamation marks and no adjectives about itself; that
   register would undercut the trust argument the page spends ten sections
   building.
4. **No wind-up.** The fact arrives in the first sentence, not the third.
5. **Never undersell.** Admitting a limit belongs in the sections that are
   *about* limits — `req`, `safe`, `faq`. It does not belong in the ones
   whose job is to say what Rovyk is good at.
6. **No em dashes.** Commit `b40cbb5` removed them from all user-facing
   text, and these are user-facing text. They also give the TTS worse
   prosody than a full stop.
7. **Numbers spelled as spoken** — "forty", "eight gigabytes",
   "eighty-four megabytes". The TTS reads what it is given.

Only the `brief` tier is current. The `dwell` and `skip` scripts from the
first set are parked: `dwell` is switched off in code (see `DISABLED_TIERS`
in `lib/voice-script.ts`) and neither has audio. Do not record them yet.


### `hero.brief` — Talk to your Mac. Watch it work.

Status: recorded.

> Hi. I'm Rovyk. I live in your menu bar, and I'm easiest to reach by name. Say it, then just talk. Rename these forty files by date. Find the invoice from the plumber. I'll work out what that takes.

### `where.brief` — "Where can I be?"

Status: recorded.

> You'll mostly see me in the notch, which is where I do the work. The window's there for when talking isn't an option, or when you want to read back what I did and check I got it right.

### `features.brief` — "10 groups. 59 tools."

Status: recorded.

> Have a sweep through these. Most are shortcuts for the things you'll ask for often. The one I'd point out is Any app, because it's why the list isn't a limit: anything with a window on your screen, I can use.

### `how.brief` — "Say it once. Watch the whole chain run."

Status: recorded.

> Have a look at step three. Everything before it I'll just get on with, because you can undo it. Step three is the one that sends or deletes something, so that's where I stop and check with you first.

### `orb.brief` — "Five states. You always know which one."

Status: recorded, from an earlier draft. The line below is the newer text, which was
never cut; what actually ships is in `scripts/voice/manifest.json`, and reads:

> Each state is a different shape, not the same shape recoloured. That's so you can read it from across the room, and so it still reads if you can't tell indigo from pink.

The unused newer version:

> There are five of these, and they're different shapes rather than different colours, so you can tell them apart at a glance. Working is the one to know: it means I'm clicking things right now.

### `uses.brief` — "Built for how you actually use a Mac"

Status: recorded.

> Other assistants only reach apps they've partnered with. I don't need a partnership, or an API, or anything at all from the developer. If you can do it with a mouse, I can do it. Including whatever niche thing you rely on.

### `safe.brief` — "Why you can hand it the keys to your Mac"

Status: recorded.

> This is the part I'd want to read if I were you. Every gate defaults to no, so nothing happens unless you say yes. And it's plain code doing the asking, not me deciding whether something feels risky.

### `req.brief` — "What it needs. What it will not do."

Status: recorded.

> Eight gigabytes will run me. Sixteen is where I stop feeling slow. And if you're on an Intel Mac, I genuinely can't help. Better you find that out here than after the download.

### `faq.brief` — "Everything you need to know"

Status: recorded, from an earlier draft. The line below is the newer text, which was
never cut; what actually ships is in `scripts/voice/manifest.json`, and reads:

> The question everyone asks first is what leaves your Mac. Nothing does. Speech, reasoning and the voice all run locally. Add a cloud key and that request's text goes to the provider you chose, on your account. Never through me.

The unused newer version:

> The question everyone asks first is what leaves your Mac. Nothing does, unless you add your own cloud key. If you do, that one request goes to your provider, on your account. There's never a server of mine in the middle.

### `cta.brief` — "Say it once."

Status: recorded, from an earlier draft. The line below is the newer text, which was
never cut; what actually ships is in `scripts/voice/manifest.json`, and reads:

> That's it. Eighty-four megabytes, no account, no sign-in, and nothing running on my side that you'd have to depend on. Apple silicon, macOS 27 or newer.

The unused newer version:

> That's me, more or less. Eighty-four megabytes, no account, no sign-in, and nothing of mine running anywhere you'd have to trust. Apple silicon and macOS 27 or newer. Come and get me.

---

## 10. Acceptance checklist

Before opening the PR, confirm each of these. Most are one-liners in the
generator; a few need ears.

**Mechanical**

- [ ] 21 MP3s and 21 JSONs in `public/voice/`, plus `index.json`.
- [ ] Every JSON's `words` rejoined with single spaces reproduces its `text`
      exactly. This is the one assertion that catches most alignment bugs.
- [ ] Every `textSha256` matches its `text`, and `index.json` agrees with the
      per-track files.
- [ ] `durationMs` read from the decoded audio, not inferred from timings.
- [ ] Every `envelope.peak` array is the right length for its duration and
      peaks at 1.0.
- [ ] All MP3s are mono, 44.1 kHz, 64 kbps. Spot-check with `ffprobe`.
- [ ] No API key anywhere except `.env.local`.

**By ear** — listen to all 21 end to end, once, on laptop speakers.

- [ ] Nothing is clipped at the start or the end.
- [ ] Loudness is consistent across tracks. If one stands out, regenerate it
      rather than editing it.
- [ ] **"macOS"** in `req.skip` is pronounced correctly. This is the single
      most likely mispronunciation in the set. If it is wrong, do not respell
      it in the text — the caption is real text and has to stay correct. Report
      it and the line gets reworded instead.
- [ ] **"Rovyk"** is pronounced correctly wherever it appears. Same rule.
- [ ] No line sounds like it is selling something.

**Spot-check the sync** — pick three tracks, play them, and confirm the word
timings look right against the audio. A systematic offset (everything late by
a fixed amount) usually means the audio was trimmed after generation.

---

## 11. What happens next

Once this lands on `main`, the delivery system gets built against it:

1. `lib/voice-script.ts` — the manifest as typed data, generated from the same
   text so the two cannot drift.
2. The HUD — the `HEY ROVYK` tab, the deck, the caption, the lit-edge progress.
   Design is finished; see the artifact linked in §0.
3. Scroll-aware section tracking, with the full behaviour rules: settle before
   speaking, finish the current sentence before switching, once per section per
   session, silence while a modal is open, pause on tab blur.
4. Amplitude coupling from `envelope.peak` into the orbs.

Two known wrinkles on that side, noted here so they are not a surprise: the
`how`, `features` and `orb` sections pin with ScrollTrigger, so active-section
detection has to read pin progress rather than element position for those
three; and iOS silences HTML5 audio when the hardware ringer switch is off,
which nothing can detect, so the caption has to carry the experience on its
own for some iPhone visitors.

Neither affects asset production.
