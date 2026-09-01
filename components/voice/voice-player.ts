/* ────────────────────────────────────────────────────────────────────
   The player. One audio element, one frame loop, no React.

   Kept framework-free because almost nothing it does is a render: the
   caption changes about three times a second, the orb's level thirty,
   and the progress edge every frame. Pushing all of that through one
   piece of component state would re-render fifty caption spans sixty
   times a second to move a one-pixel rule.

   So there are two channels instead of one:

     onWord   fires only when the lit word or the sentence changes
     onTick   fires every frame, with the level and the progress

   A caption subscribes to the first and re-renders three times a second.
   The orb subscribes to the second. The progress edge subscribes to the
   second and writes to a style directly, never rendering at all.

   ── On the clock ────────────────────────────────────────────────
   `currentTime` is the only clock. Not a timer started alongside the
   audio, which drifts; not a GSAP tween, which does not know the audio
   stalled to buffer. If the voice pauses, the caption pauses, because
   they are the same number.
   ──────────────────────────────────────────────────────────────────── */

import {
  trackAudio,
  trackData,
  type VoiceAlignment,
  type VoiceTrack,
} from "@/lib/voice-script";

export type VoiceWordFrame = {
  /** Index of the word being spoken, or -1 before the first one. */
  word: number;
  /** Index into `alignment.sentences`, or -1. */
  sentence: number;
};

export type VoiceTickFrame = {
  /** 0–1, from the committed envelope. Drives the orb. */
  level: number;
  /** 0–1 through the track. Drives the lit edge. */
  progress: number;
};

type Loaded = { track: VoiceTrack; alignment: VoiceAlignment };

/** How far ahead of the audio the caption lights a word.
 *
 *  Alignment marks when a word *starts sounding*, but a reader's eye
 *  arrives fractionally before the ear does — lighting exactly on the
 *  onset reads as lagging. Small enough that nobody could name it. */
const LEAD_MS = 60;

export class VoicePlayer {
  private el: HTMLAudioElement | null = null;
  private loaded: Loaded | null = null;
  private raf = 0;
  private last: VoiceWordFrame = { word: -1, sentence: -1 };

  private wordSubs = new Set<(f: VoiceWordFrame) => void>();
  private tickSubs = new Set<(f: VoiceTickFrame) => void>();
  private endSubs = new Set<(trackId: string) => void>();

  /** Alignment keyed by file basename. Small — a few KB each — and the
   *  same track is often replayed, so there is no reason to refetch. */
  private cache = new Map<string, VoiceAlignment>();

  /* ── Subscriptions ─────────────────────────────────────────────── */

  onWord(fn: (f: VoiceWordFrame) => void) {
    this.wordSubs.add(fn);
    return () => void this.wordSubs.delete(fn);
  }

  onTick(fn: (f: VoiceTickFrame) => void) {
    this.tickSubs.add(fn);
    return () => void this.tickSubs.delete(fn);
  }

  /** Fires when a track reaches its end on its own. Not on `stop()` —
   *  the conductor treats "it finished" and "you stopped it" as different
   *  events, because only one of them should start something else. */
  onEnd(fn: (trackId: string) => void) {
    this.endSubs.add(fn);
    return () => void this.endSubs.delete(fn);
  }

  /* ── State ─────────────────────────────────────────────────────── */

  get current(): VoiceTrack | null {
    return this.loaded?.track ?? null;
  }

  get alignment(): VoiceAlignment | null {
    return this.loaded?.alignment ?? null;
  }

  get playing(): boolean {
    return !!this.el && !this.el.paused && !this.el.ended;
  }

  /* ── Loading ───────────────────────────────────────────────────── */

  /**
   * Fetch a track's alignment, and let the browser start on the audio.
   *
   * Safe to call for something that may never play — that is the point.
   * Nothing is fetched until the visitor has woken the HUD, and from then
   * on the next likely track is warmed while the current one speaks.
   */
  async prefetch(track: VoiceTrack): Promise<VoiceAlignment | null> {
    if (!track.file) return null;
    const cached = this.cache.get(track.file);
    if (cached) return cached;
    try {
      const res = await fetch(trackData(track.file));
      if (!res.ok) return null;
      const alignment: VoiceAlignment = await res.json();
      this.cache.set(track.file, alignment);
      // Warms the HTTP cache; the element that eventually plays it is a
      // different one, but the bytes are the bytes.
      new Audio(trackAudio(track.file)).preload = "auto";
      return alignment;
    } catch {
      return null;
    }
  }

  /* ── Playing ───────────────────────────────────────────────────── */

  /**
   * Play a track from the start.
   *
   * The element is created on the first call and reused after, because
   * the first call happens inside the click that wakes the HUD — which
   * is the gesture the autoplay policy wants to see. An element created
   * later, off a scroll, would be blocked.
   */
  async play(track: VoiceTrack): Promise<boolean> {
    if (!track.file) return false;
    const alignment =
      this.cache.get(track.file) ?? (await this.prefetch(track));
    if (!alignment) return false;

    if (!this.el) {
      this.el = new Audio();
      this.el.preload = "auto";
      this.el.addEventListener("ended", () => {
        const id = this.loaded?.track.id;
        this.halt();
        // Settle the caption on its last word rather than blanking it.
        if (id) this.endSubs.forEach((fn) => fn(id));
      });
    }

    this.loaded = { track, alignment };
    this.el.src = trackAudio(track.file);
    this.el.currentTime = 0;
    this.emitWord({ word: -1, sentence: -1 });

    try {
      await this.el.play();
    } catch {
      // Blocked, or the source went away. Either way there is no sound,
      // and the HUD should not sit there claiming to be speaking.
      this.halt();
      return false;
    }

    this.loop();
    return true;
  }

  /** Stop and clear. Does not fire `onEnd` — see the note there. */
  stop(): void {
    if (this.el) {
      this.el.pause();
      this.el.removeAttribute("src");
      this.el.load();
    }
    this.halt();
    this.loaded = null;
    this.emitWord({ word: -1, sentence: -1 });
    this.emitTick({ level: 0, progress: 0 });
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Release everything. The provider calls this on unmount. */
  destroy(): void {
    this.stop();
    this.el = null;
    this.wordSubs.clear();
    this.tickSubs.clear();
    this.endSubs.clear();
    this.cache.clear();
  }

  /* ── The frame loop ────────────────────────────────────────────── */

  private loop = (): void => {
    const el = this.el;
    const loaded = this.loaded;
    if (!el || !loaded || el.paused) return;

    const ms = el.currentTime * 1000;
    const { words, sentences, envelope, durationMs } = loaded.alignment;

    /* Words are ordered and non-overlapping, so the lit one is the last
       whose start has passed. Scanned forward from the previous answer
       rather than searched: between two frames it has moved by at most a
       word, and usually not at all. */
    let word = this.last.word;
    while (word + 1 < words.length && words[word + 1].s <= ms + LEAD_MS) word++;
    // A seek backwards, or a replay, is the only way this runs.
    while (word >= 0 && words[word].s > ms + LEAD_MS) word--;

    let sentence = this.last.sentence;
    if (word !== this.last.word || sentence < 0) {
      sentence = sentences.findIndex((s) => word >= s.start && word < s.end);
    }

    if (word !== this.last.word || sentence !== this.last.sentence) {
      this.emitWord({ word, sentence });
    }

    const level = envelope
      ? (envelope.peak[Math.floor((ms / 1000) * envelope.fps)] ?? 0)
      : 0;
    this.emitTick({
      level,
      progress: durationMs ? Math.min(1, ms / durationMs) : 0,
    });

    this.raf = requestAnimationFrame(this.loop);
  };

  private emitWord(frame: VoiceWordFrame): void {
    this.last = frame;
    this.wordSubs.forEach((fn) => fn(frame));
  }

  private emitTick(frame: VoiceTickFrame): void {
    this.tickSubs.forEach((fn) => fn(frame));
  }
}
