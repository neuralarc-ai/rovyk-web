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

Six rules they follow, listed so that edits stay in voice:

1. **Never read the page.** Every script starts where the visible copy stops.
   Nothing here restates a headline, a spec or a body line.
2. **One checkable thing per track** that is not on screen — a mechanism, a
   number, a limitation.
3. **First person, present tense, dry.** No "welcome to", no "as you can see",
   no adjectives about itself.
4. **No em dashes.** Commit `b40cbb5` removed them from all user-facing text,
   and these are user-facing text. They also give the TTS worse prosody than a
   full stop.
5. **Numbers are spelled as they should be spoken** — "fifty-nine", "eight
   gigabytes", "eighty-four megabytes". The TTS reads what it is given.
6. **35 to 50 words.** Twelve to fifteen seconds. `skip` lines are half that.

---

### `intro.reply` — the hero splash

Not narration. This is the existing spoken reply in
`components/intro-section.tsx`, which becomes real audio. **It must match that
file's `REPLY` constant exactly**; if the two ever disagree, the file wins and
this document is stale.

> I open your apps, read your mail, and find the file you forgot the name of. I click buttons in software that has never heard of me. All of it on this Mac.

---

### `hero` — "Talk to your Mac. Watch it work."

**`hero.brief`**

> You've just turned me on, which is the only thing on this page you have to do. From here I follow you down it. On the screen below, that's a real run. Four steps, and it stops before the one that sends.

**`hero.dwell`**

> Everything you're about to read is something I do on the machine, not something I say about it. If a claim on this page couldn't be checked, it came off. Hold me to that.

---

### `where` — "Where can I be?"

**`where.brief`**

> I default to the notch because most of what you ask takes a few steps and no reading. It retracts on its own when the run ends, so there's nothing to close. The window is for the times you want to check my work, or the times you can't say it out loud.

**`where.dwell`**

> The window isn't the lesser surface. It's where the whole scrollback lives, and if you're going to catch me doing something wrong, that's where you'll see it. I'd use it for the first week.

---

### `features` — "10 groups. 59 tools."

**`features.brief`**

> Fifty-nine isn't the interesting number. Nine of these groups are the ordinary kind. Mail, files, volume. One is not. Any app is me clicking and typing in software that has never heard of me, and it's the group that makes the rest worth having.

**`features.dwell`**

> There's no routing table behind this. No fixed intents, no menu I match against. One model sees what you said, the thread, and your screen, then picks. Which means I can be wrong in ways a command menu can't. That's why there's a gate.

---

### `how` — "Say it once. Watch the whole chain run."

**`how.brief`**

> Watch where the gate sits. Not at the start, where you'd be approving a plan you haven't seen yet. Not at the end, where the damage is already done. It stands in front of the one step that can't be undone, and nothing else.

**`how.dwell`**

> If a step fails halfway, I stop and say so rather than carrying on down the chain. A run that half worked and reported success would be the worst thing I could do to you. There's a check for that too.

---

### `orb` — "Five states. You always know which one."

**`orb.brief`**

> The one to watch is Working. Idle and Listening you'll stop noticing by the second day. Working means I'm clicking things, and that's the state you want to be able to read from across the room.

**`orb.dwell`**

> The shapes aren't decoration. Each one is a different geometry, not the same ball in a different colour. Colour on its own would be useless to anyone who can't tell indigo from pink, and this is the one part of the interface that has to be readable at a glance.

---

### `uses` — "Built for how you actually use a Mac"

**`uses.brief`**

> Driving apps the way you do has a cost worth knowing. A real integration is faster and never breaks. I'm slower, and when an app moves its buttons I have to find them again. What I get for that is every app, instead of the six that signed a deal.

**`uses.dwell`**

> Memory is the one people underrate. Not that I remember your name. That I remember which folder the invoices live in, so the second time you ask is four words instead of a sentence. It gets shorter the longer you use it.

---

### `safe` — "Why you can hand it the keys to your Mac"

**`safe.brief`**

> Cancel is the default answer. Not because you're careless, but because a gate that defaults to yes is a gate you click through without reading. If it annoys you slightly in week two, that's the gate working.

**`safe.dwell`**

> The middle one is the one nobody else ships. An assistant claiming it sent mail it never sent is this category's real failure, and most products won't say the words out loud. A check runs after every reply looking for exactly that.

**`safe.skip`**

> You went past the part about what stops me. There's a confirmation gate before anything irreversible, and it's written in code, not left to the model.

---

### `req` — "What it needs. What it will not do."

**`req.brief`**

> Eight gigabytes runs me. Sixteen is where I stop being slow. And if you're on an Intel Mac, this is the section where you find out I can't help you, which I'd rather you learned here than after the download.

**`req.dwell`**

> The offline tier is real, and it's weaker. System control and files don't need a network. Six steps of reasoning does, and that's a key in Settings. Yours, not mine. I don't have a server to bill you from. There isn't one.

**`req.skip`**

> You went past requirements. Apple silicon, macOS 27, eight gigabytes. If you're on an Intel Mac, stop here.

---

### `faq` — "Everything you need to know"

One track only. An FAQ is scanned rather than read, and a second voice running
over someone reading an answer is noise. So this one points rather than
narrates, and there is no `dwell`.

**`faq.brief`**

> If you open only one of these, open the second. What leaves your Mac is the question everything else on this page depends on, and the answer is shorter than you'd expect.

---

### `cta` — "Say it once."

**`cta.brief`**

> That's everything. Eighty-four megabytes, no account, no server of mine to sign in to. If you're on Apple silicon, the next thing that happens is you say my name out loud in a quiet room and feel slightly ridiculous. Everyone does. It passes.

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
