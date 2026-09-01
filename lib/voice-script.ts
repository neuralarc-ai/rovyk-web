/* ────────────────────────────────────────────────────────────────────
   The narration, as data.

   Voice mode is Rovyk reading the page in its own first person: one
   purpose-written script per section rather than a read-aloud of the
   copy, because the premise of the product is that it tells you more
   than you asked for. The scripts themselves — and the rules they were
   written to — live in `docs/voice-narration.md`; this file is only the
   table the player reads.

   Two things are deliberately kept here rather than in the components:

   1. **Which file belongs to which track.** The names line up with the
      ids now, but the indirection stays: the first delivery arrived
      named by content rather than by track, and one file turned out to
      hold a different script than its name claimed. `file` is the one
      place a mismatch has to be reconciled if it happens again.

   2. **Which tracks do not exist yet.** A missing track is silence,
      never an error — a section without audio is simply a section the
      voice has nothing to add to, and the page has to be complete
      without any of this anyway.
   ──────────────────────────────────────────────────────────────────── */

/**
 * When a track plays.
 *
 * - `brief` — on arriving in the section. Every section that speaks has one.
 * - `dwell` — only if the brief finishes and you are still in the same
 *   section. Most visitors never hear one; see the note on `SECTIONS`.
 * - `skip`  — only if the section went past at speed. Two exist, total.
 * - `reply` — not narration. The intro splash's own spoken line, which
 *   becomes real audio rather than a typed animation.
 */
export type VoiceTier = "brief" | "dwell" | "skip" | "reply";

export type VoiceTrack = {
  /** `<section>.<tier>`, and the `id` inside the alignment JSON. */
  id: string;
  /** The `id` attribute of the section on the page. Narrowed to the
   *  table below so a typo here is a build error rather than a track
   *  that silently never plays. */
  section: VoiceSection;
  tier: VoiceTier;
  /**
   * Basename of the delivered pair, without extension — `<file>.mp3` and
   * `<file>.json` sit beside each other. `null` while a script is written
   * but not yet recorded.
   */
  file: string | null;
};

/** Where the pairs live, relative to the site root. */
export const VOICE_DIR = "/assets/audio";

export const trackAudio = (file: string) => `${VOICE_DIR}/${file}.mp3`;
export const trackData = (file: string) => `${VOICE_DIR}/${file}.json`;

/* ── The alignment files ──────────────────────────────────────────────
   Written by `scripts/voice/align_ctc.py`, which runs a character-level
   CTC model against audio we already have and the script it was read
   from. Because the transcript is known, the model is never guessing at
   words — only at when each one is spoken — which is what makes the
   caption light on the voice rather than on a fixed rate.

   Times are integer milliseconds throughout, compared against
   `currentTime * 1000`. Seconds as floats drift; integers do not.
   ──────────────────────────────────────────────────────────────────── */

/** One word, as it will be rendered. Punctuation stays attached: the
 *  caption prints `w` verbatim, so a stripped comma is a visible bug. */
export type VoiceWord = { w: string; s: number; e: number };

/** A sentence, as indices into `words` — half-open, `start` inclusive.
 *  The caption window advances by these so it never breaks mid-clause. */
export type VoiceSentence = { start: number; end: number; s: number; e: number };

/** A peak envelope at `fps`, normalised so the loudest frame is 1.
 *  This is what lets the orb ride the voice without an `AudioContext`:
 *  the player reads `currentTime` and looks the frame up. */
export type VoiceEnvelope = { fps: number; peak: number[] };

export type VoiceAlignment = {
  id: string;
  text: string;
  textSha256: string;
  source: string;
  durationMs: number;
  words: VoiceWord[];
  sentences: VoiceSentence[];
  envelope: VoiceEnvelope | null;
};

/* ── The page, in the order it is met ─────────────────────────────────
   Section ids match the `id` attributes on `/rovyk`. The order is the
   document's, which is what lets "have I already heard this one" be a
   position rather than a set lookup.

   `intro` and `hero` carry ids added for this feature and nothing else;
   every other section already answered to its name because the nav and
   the footer index link to them.

   ── On `dwell`, and why most of them will never be heard ──────────
   A section is only the live one for the scroll distance between its top
   and the next section's. Measured on `/rovyk` at 1440×900, that is 890
   to 1600 pixels for most of them — and a *slow* deliberate read moves
   about 73 pixels a second. So a fifteen-second brief needs a reader
   travelling under 60px/s to be heard whole, which nobody is.

   That is not a reason to shorten the scripts. It is the reason a track,
   once started, plays to completion and is never cut off by scrolling —
   see `useVoiceConductor`. `dwell` then means what it was written to
   mean: the thing only a reader who actually stopped will hear. On
   desktop that is realistically `orb` alone, which at 4078px is four and
   a half screens tall and is also the section with the most to say.
   ──────────────────────────────────────────────────────────────────── */

export const SECTIONS = [
  "intro",
  "hero",
  "where",
  "features",
  "how",
  "orb",
  "uses",
  "safe",
  "req",
  "faq",
  "cta",
] as const;

export type VoiceSection = (typeof SECTIONS)[number];

/**
 * What the HUD calls a section out loud.
 *
 * The nav's own labels wherever the two overlap, because a section the
 * rail calls "Where it lives" cannot be "where" in the thing narrating
 * it. The rest are written in the same voice: a phrase, not a noun.
 */
export const SECTION_LABEL: Record<VoiceSection, string> = {
  intro: "Rovyk",
  hero: "Talk to your Mac",
  where: "Where it lives",
  features: "What it can do",
  how: "How it works",
  orb: "The orb",
  uses: "What sets it apart",
  safe: "Control",
  req: "Requirements",
  faq: "Questions",
  cta: "Say it once",
};

/**
 * Every track, recorded or not.
 *
 * `file: null` is a script that exists in the document and not yet on
 * disk. Nothing branches on it beyond "there is nothing to play here".
 */
export const TRACKS: VoiceTrack[] = [
  /* The splash already speaks, and owns its own audio: the *ask* is
     `supertonic_speech.mp3`, played from inside the intro's own timeline
     so the clip and the typing cannot drift. This is the other half, the
     reply, and it is unrecorded. The conductor never touches either,
     because `intro` carries no recorded track and so is not one of the
     sections it watches. */
  { id: "intro.reply", section: "intro", tier: "reply", file: null },

  { id: "hero.brief", section: "hero", tier: "brief", file: "hero.brief" },
  { id: "hero.dwell", section: "hero", tier: "dwell", file: null },

  { id: "where.brief", section: "where", tier: "brief", file: "where.brief" },
  { id: "where.dwell", section: "where", tier: "dwell", file: null },

  { id: "features.brief", section: "features", tier: "brief", file: "features.brief" },
  { id: "features.dwell", section: "features", tier: "dwell", file: null },

  { id: "how.brief", section: "how", tier: "brief", file: "how.brief" },
  { id: "how.dwell", section: "how", tier: "dwell", file: null },

  /* Cut from an earlier draft of the script, along with `faq` and
     `cta`. Kept rather than re-recorded, so for these three the words
     in `scripts/voice/manifest.json` are what is actually spoken and
     `docs/voice-narration.md` records the newer text that was never
     used. The manifest is the one the caption is built from. */
  { id: "orb.brief", section: "orb", tier: "brief", file: "orb.brief" },
  { id: "orb.dwell", section: "orb", tier: "dwell", file: null },

  { id: "uses.brief", section: "uses", tier: "brief", file: "uses.brief" },
  { id: "uses.dwell", section: "uses", tier: "dwell", file: null },

  { id: "safe.brief", section: "safe", tier: "brief", file: "safe.brief" },
  { id: "safe.dwell", section: "safe", tier: "dwell", file: null },
  { id: "safe.skip", section: "safe", tier: "skip", file: null },

  { id: "req.brief", section: "req", tier: "brief", file: "req.brief" },
  { id: "req.dwell", section: "req", tier: "dwell", file: null },
  { id: "req.skip", section: "req", tier: "skip", file: null },

  /* See the note on `orb.brief`. */
  { id: "faq.brief", section: "faq", tier: "brief", file: "faq.brief" },

  /* See the note on `orb.brief`. */
  { id: "cta.brief", section: "cta", tier: "brief", file: "cta.brief" },
];

/**
 * Tiers switched off for now.
 *
 * **Temporary.** Empty this array to put them back — there is nothing
 * else to undo, because every path that reaches a track goes through
 * `trackFor` below: the conductor asks for the dwell when a brief ends,
 * and `say` asks for it again to warm the next file. Disabling it here
 * turns off both, and the conductor's own fallback takes over — a brief
 * that ends simply leaves the voice idle until the next section, which
 * is what it already does for any section that has no dwell recorded.
 *
 * `sectionSpeaks` deliberately does *not* consult this: a section is
 * still a section the voice watches, it just has less to say there.
 */
export const DISABLED_TIERS: VoiceTier[] = ["dwell"];

/** The one track for a section and tier, if it has been recorded and
 *  its tier is currently switched on. */
export function trackFor(
  section: VoiceSection,
  tier: VoiceTier,
): VoiceTrack | undefined {
  if (DISABLED_TIERS.includes(tier)) return undefined;
  const track = TRACKS.find((t) => t.section === section && t.tier === tier);
  return track?.file ? track : undefined;
}

/** Whether a section has anything at all to say yet. Used to skip the
 *  settle timer entirely rather than wait 1.2s to discover silence. */
export const sectionSpeaks = (section: VoiceSection) =>
  TRACKS.some((t) => t.section === section && t.file !== null);

/** Sections in document order that carry at least one recorded track.
 *  What the conductor actually watches; the rest are not observed. */
export const VOICE_SECTIONS = SECTIONS.filter(sectionSpeaks);

/**
 * The section under the line, right now.
 *
 * `ScrollTrigger` reports *changes*, and a trigger created while already
 * inside its own range does not announce itself — so waking the HUD in
 * the middle of a section would leave the conductor believing it was
 * nowhere. This answers the question directly, once, at the moment of
 * waking; the triggers take it from there.
 *
 * The last section whose top has crossed the line, not the nearest —
 * the same rule and the same line `reachedSection` in `lib/notch.ts`
 * uses for the drawer's index, so the two can never disagree about
 * where the reader has got to.
 */
export function sectionAtLine(): VoiceSection | null {
  const line = window.innerHeight * 0.4;
  let reached: VoiceSection | null = null;
  for (const id of VOICE_SECTIONS) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= line) reached = id;
  }
  return reached;
}

/* ── Cues ─────────────────────────────────────────────────────────────
   Sentences are the right unit for *not breaking mid-clause*. They are
   the wrong unit for showing on screen: "Everyone does." is two words
   and seven hundred milliseconds, and a caption that swaps to it and
   away again reads as a flicker rather than as speech.

   So the caption shows cues, which is what subtitling has always shown
   — sentences accumulated until there is enough of one to be worth
   reading. Built once when a track loads, from the alignment we already
   have.
   ──────────────────────────────────────────────────────────────────── */

export type VoiceCue = { start: number; end: number; s: number; e: number };

/** Short enough to still be one thought, long enough not to blink. */
const CUE_MIN_WORDS = 6;
const CUE_MIN_MS = 1600;

export function toCues(alignment: VoiceAlignment): VoiceCue[] {
  const cues: VoiceCue[] = [];
  let open: VoiceCue | null = null;

  for (const sentence of alignment.sentences) {
    open = open
      ? { start: open.start, s: open.s, end: sentence.end, e: sentence.e }
      : { start: sentence.start, end: sentence.end, s: sentence.s, e: sentence.e };
    const words = open.end - open.start;
    if (words >= CUE_MIN_WORDS && open.e - open.s >= CUE_MIN_MS) {
      cues.push(open);
      open = null;
    }
  }
  /* A tail too short to stand on its own joins the cue before it rather
     than flashing by alone. */
  if (open) {
    const last = cues.at(-1);
    if (last && open.end - open.start < CUE_MIN_WORDS) {
      last.end = open.end;
      last.e = open.e;
    } else {
      cues.push(open);
    }
  }
  return cues.length ? cues : [{ start: 0, end: alignment.words.length, s: 0, e: alignment.durationMs }];
}

/** Which cue a word index falls in. */
export const cueOf = (cues: VoiceCue[], word: number) =>
  Math.max(0, cues.findIndex((c) => word >= c.start && word < c.end));
