"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { OrbState } from "thinking-orbs/engine";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { RovykWordmark } from "@/components/rovyk-wordmark";
import { ENTITY } from "@/lib/legal";
import { HeroOrb } from "@/components/hero-orb";
import { CaretDoubleDownIcon } from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ────────────────────────────────────────────────────────────────────
   The exchange. Fixed copy — the whole section is one scripted turn.
   ──────────────────────────────────────────────────────────────────── */

const ASK = "Hey Rovyk, what can you do for me?";
/** Typed in the agent's own colour — the part that is addressing it. */
const WAKE = "Hey Rovyk,";

const REPLY = [
  "I open your apps, read your mail, and find the file you forgot the name of.",
  "I click buttons in software that has never heard of me. All of it on this Mac.",
];

/** The ask, spoken — triggered from inside the timeline itself, at the same
 *  cue the typing starts on, so the two can never drift apart regardless of
 *  which run (the automatic first one, or a replay) is playing. */
const AUDIO_SRC = "/assets/audio/supertonic_speech.mp3";

/** Don't let a slow network hold the whole intro hostage — if the clip
 *  isn't decoded within this long, start on the guessed rate instead; it
 *  keeps loading in the background and a later replay will pick it up. */
const AUDIO_LOAD_TIMEOUT_MS = 1500;

/* ── Finding the speech inside the file ──────────────────────────────
   An MP3 encoder pads both ends of a clip so every frame is full —
   typically tens of milliseconds — and a TTS render can add much more of
   its own on top. `HTMLMediaElement.duration` is also only an *estimate*
   for MP3 (file size over average bitrate), not the file's real decoded
   length. Typing the ask out over either of those numbers means racing
   or trailing the words actually being spoken, so this measures the
   audible span directly from the decoded samples instead. */
const SILENCE_WINDOW_MS = 20;
const SILENCE_THRESHOLD_DB = -45;
const MIN_SPEECH_DURATION = 0.15;

type Clip = { buffer: AudioBuffer; leadIn: number; duration: number };

function analyzeSpeech(buffer: AudioBuffer): Omit<Clip, "buffer"> {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const windowSize = Math.max(1, Math.round((sr * SILENCE_WINDOW_MS) / 1000));

  let firstLoud = -1;
  let lastLoud = -1;
  for (let i = 0, w = 0; i < data.length; i += windowSize, w++) {
    let sum = 0;
    const end = Math.min(i + windowSize, data.length);
    for (let j = i; j < end; j++) sum += data[j] * data[j];
    const rms = Math.sqrt(sum / (end - i));
    const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    if (db > SILENCE_THRESHOLD_DB) {
      if (firstLoud === -1) firstLoud = w;
      lastLoud = w;
    }
  }

  const leadIn = firstLoud >= 0 ? (firstLoud * windowSize) / sr : 0;
  const speechEnd =
    lastLoud >= 0 ? ((lastLoud + 1) * windowSize) / sr : buffer.duration;
  return { leadIn, duration: Math.max(MIN_SPEECH_DURATION, speechEnd - leadIn) };
}

/**
 * Canvas is rasterised once at this size and scaled *down* in CSS, so the orb
 * is never upsampled — it reaches full size only while composing, leaning into
 * the slot it already occupies.
 */
const ORB_PX = 200;
const ORB_REST = 0.86;

/* ── Cue sheet ────────────────────────────────────────────────────────
   Absolute seconds, not relative offsets. Every beat is positioned
   against the timeline origin so that retiming one step cannot cascade
   into the others, and so the whole performance can be read at a glance.

   `shift` is the one deliberate exception: when the ask is voiced, the
   clip almost certainly runs longer than the guessed typing duration
   below, and everything from `settle` on has to move later by exactly
   that much or the caret would vanish and the reply would start while
   the voice was still mid-sentence. It is a single number threaded
   through the back half of the sheet, not a second set of offsets to
   keep in sync with the first. Everything before `type` — including the
   byline — sits ahead of where `shift` ever applies, so it never moves. */
const CUE = {
  splashIn: 0.25,
  byline: 1.35,
  splashOut: 2.05,
  lights: 2.15,
  orbIn: 2.35,
  listen: 3.3,
  type: 3.45,
  settle: 4.7,
  think: 4.95,
  reply: 5.85,
  replyTail: 7.05,
  rest: 8.7,
} as const;

const cueSheet = (shift: number) => ({
  ...CUE,
  settle: CUE.settle + shift,
  think: CUE.think + shift,
  reply: CUE.reply + shift,
  replyTail: CUE.replyTail + shift,
  rest: CUE.rest + shift,
});

const TYPE_RATE = 0.036; // seconds per character, when there is no audio to match
const DEFAULT_TYPE_DURATION = ASK.length * TYPE_RATE;

export function IntroSection() {
  const [orbState, setOrbState] = useState<OrbState>("searching");
  const root = useRef<HTMLElement>(null);
  const wakeRef = useRef<HTMLSpanElement>(null);
  const restRef = useRef<HTMLSpanElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const clipRef = useRef<Clip | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

      const splash = q("[data-splash]");
      const letters = q("[data-letter]");
      const byline = q("[data-byline]");
      const glow = q("[data-glow]");
      const orb = q("[data-orb]");
      const askLine = q("[data-ask]");
      const caret = q("[data-caret]");
      const replyLines = q("[data-reply-line]");
      const replyWords = q("[data-word]");
      const foot = q("[data-foot]");

      /* One counter drives both spans, so the wake word can carry the agent's
         colour while the request stays plain — without splitting the tween. */
      const writeAsk = (n: number) => {
        const k = Math.round(n);
        if (wakeRef.current)
          wakeRef.current.textContent = ASK.slice(0, Math.min(k, WAKE.length));
        if (restRef.current) {
          restRef.current.textContent =
            k > WAKE.length ? ASK.slice(WAKE.length, k) : "";
        }
      };

      /* Reduced motion: no performance, just the finished frame. */
      if (reduced) {
        setOrbState("searching");
        gsap.set(splash, { autoAlpha: 0 });
        gsap.set([glow, orb, askLine, ...replyLines, ...replyWords, foot], {
          autoAlpha: 1,
        });
        gsap.set(orb, { scale: ORB_REST });
        gsap.set(replyWords, { y: 0, filter: "blur(0px)" });
        gsap.set(caret, { autoAlpha: 0 });
        writeAsk(ASK.length);
        return;
      }

      /* Decoded and measured once, cached for every run after the first.
         Web Audio rather than an `<audio>` element for two reasons: decoding
         gives the real sample count (not MP3's size/bitrate *estimate*) to
         measure the silence against, and `start(when, offset)` can begin
         playback already past the lead-in — no separate seek, no risk of a
         stray frame of silence slipping out before the first word. */
      const loadClip = async (): Promise<Clip | null> => {
        if (clipRef.current) return clipRef.current;
        try {
          const AudioContextCtor =
            window.AudioContext ??
            (
              window as unknown as {
                webkitAudioContext?: typeof AudioContext;
              }
            ).webkitAudioContext;
          if (!AudioContextCtor) return null;
          const ctx = audioCtxRef.current ?? new AudioContextCtor();
          audioCtxRef.current = ctx;

          const res = await fetch(AUDIO_SRC);
          const bytes = await res.arrayBuffer();
          const buffer = await ctx.decodeAudioData(bytes);
          const clip: Clip = { buffer, ...analyzeSpeech(buffer) };
          clipRef.current = clip;
          return clip;
        } catch {
          return null;
        }
      };

      const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
        new Promise((resolve) => {
          const timer = window.setTimeout(() => resolve(null), ms);
          p.then(
            (v) => {
              window.clearTimeout(timer);
              resolve(v);
            },
            () => {
              window.clearTimeout(timer);
              resolve(null);
            },
          );
        });

      const playClip = (clip: Clip) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        try {
          sourceRef.current?.stop();
        } catch {
          /* already stopped or never started — nothing to clean up */
        }
        const source = ctx.createBufferSource();
        source.buffer = clip.buffer;
        source.connect(ctx.destination);
        // Trimmed at both ends to the measured speech span, not just the
        // front — otherwise the node keeps running silently through the
        // trailing pad too.
        source.start(0, clip.leadIn, clip.duration);
        sourceRef.current = source;
      };

      /**
       * One run of the performance, built fresh each time so the typing
       * beat's duration — and everything timed off the end of it — can
       * differ between the silent first run and a voiced replay.
       */
      const build = (typeDuration: number, shift: number, clip: Clip | null) => {
        const cue = cueSheet(shift);
        const typed = { chars: 0 };
        const t = gsap.timeline({ paused: true });

        t
          /* Reset — every property the performance touches, so a replay
             starts from the same black screen as a cold load. */
          .set(
            splash,
            { autoAlpha: 1, scale: 1, yPercent: 0, filter: "blur(0px)" },
            0,
          )
          .set([glow, orb, askLine, replyLines, foot], { autoAlpha: 0 }, 0)
          .set(orb, { scale: 0 }, 0)
          .set(askLine, { y: 14, scale: 0.96, filter: "blur(5px)" }, 0)
          .set(replyWords, { autoAlpha: 0, y: "0.35em", filter: "blur(6px)" }, 0)
          .set(caret, { autoAlpha: 1 }, 0)
          .call(() => writeAsk(0), undefined, 0)

          /* ── Splash ──────────────────────────────────────────────────
             The wordmark assembles left to right, holds, then dissolves
             upward — it does not fade, it gets out of the way. */
          .fromTo(
            letters,
            { autoAlpha: 0, yPercent: 22, filter: "blur(12px)" },
            {
              autoAlpha: 1,
              yPercent: 0,
              filter: "blur(0px)",
              duration: 0.85,
              ease: "power3.out",
              stagger: 0.07,
            },
            cue.splashIn,
          )

          /* Under the mark, after it. The letters land at 1.38 and the splash
             starts leaving at 2.05, so this is the only window there is: it
             arrives as the last letter settles and holds for two thirds of a
             second. Late enough to read as a byline under a title rather than
             as part of it, and it leaves on the container's own tween because
             it is the same object getting out of the way. */
          .fromTo(
            byline,
            { autoAlpha: 0, y: 7 },
            { autoAlpha: 1, y: 0, duration: 0.55, ease: "power2.out" },
            cue.byline,
          )
          .to(
            splash,
            {
              autoAlpha: 0,
              scale: 1.07,
              yPercent: -4,
              filter: "blur(16px)",
              duration: 0.7,
              ease: "power2.in",
            },
            cue.splashOut,
          )

          /* ── The room lights ─────────────────────────────────────── */
          .to(
            glow,
            { autoAlpha: 1, duration: 1.6, ease: "power2.out" },
            cue.lights,
          )
          .to(
            orb,
            {
              autoAlpha: 1,
              scale: ORB_REST,
              duration: 1.1,
              ease: "back.out(1.4)",
            },
            cue.orbIn,
          )

          /* ── The question, transcribed ───────────────────────────────
             Character by character with a caret, deliberately unlike the
             reply below: this is speech being written down as it lands,
             not prose being composed. Its duration is `typeDuration` — the
             guessed reading rate on a silent run, the clip's measured
             speech span on a voiced one — so the last character always
             lands with the last word, not with the file's own end. */
          .call(() => setOrbState("listening"), undefined, cue.listen)
          /* Arrives dim and provisional — the mic is open, nothing is committed. */
          .to(
            askLine,
            {
              autoAlpha: 0.62,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.62,
              ease: "power3.out",
            },
            cue.listen,
          )
          /* The voice starts exactly where the caret does — this `.call` is
             the only place playback is ever started, so the first automatic
             run and every replay stay in sync the same way. Starting with
             no clip loaded, or a browser refusing playback with no user
             gesture behind it, is silent rather than an error either way. */
          .call(
            () => {
              if (clip) playClip(clip);
            },
            undefined,
            cue.type,
          )
          .fromTo(
            typed,
            { chars: 0 },
            {
              chars: ASK.length,
              duration: typeDuration,
              ease: "none",
              onUpdate: () => writeAsk(typed.chars),
            },
            cue.type,
          )

          /* ── Commit ──────────────────────────────────────────────────
             The request lands. Rather than fading into the background once
             the reply arrives, it brightens and holds: the caret goes and the
             line comes up to full. What was said stays on the record for the
             whole section, and one opacity carries that — the border and fill
             that used to firm up alongside it were the same beat, said twice
             in furniture. */
          .to(caret, { autoAlpha: 0, duration: 0.3 }, cue.settle)
          .to(
            askLine,
            { autoAlpha: 1, duration: 0.55, ease: "power2.out" },
            cue.settle,
          )

          /* ── Thinking ────────────────────────────────────────────── */
          .call(() => setOrbState("solving"), undefined, cue.think)

          /* ── The reply, composed ─────────────────────────────────────
             Word by word rather than character by character. It reads as
             language arriving in units of meaning, and it is the exact
             structure per-word audio timestamps will drive later. */
          .call(() => setOrbState("composing"), undefined, cue.reply)
          .to(orb, { scale: 1, duration: 0.9, ease: "power2.out" }, cue.reply)
          .set(replyLines, { autoAlpha: 1 }, cue.reply)
          .to(
            q("[data-reply-line='0'] [data-word]"),
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.62,
              ease: "power2.out",
              stagger: 0.055,
            },
            cue.reply,
          )
          .to(
            q("[data-reply-line='1'] [data-word]"),
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.62,
              ease: "power2.out",
              stagger: 0.045,
            },
            cue.replyTail,
          )

          /* ── Rest ─────────────────────────────────────────────────────
             Back to the dense globe rather than the ring: at hero scale the
             ring reads as a loading spinner, the globe reads as the orb. */
          .call(() => setOrbState("searching"), undefined, cue.rest)
          .to(
            orb,
            { scale: ORB_REST, duration: 1.1, ease: "power2.inOut" },
            cue.rest,
          )
          .to(
            foot,
            { autoAlpha: 1, duration: 0.9, ease: "power2.out" },
            cue.rest + 0.2,
          );

        return t;
      };

      let tl: gsap.core.Timeline | undefined;
      let cancelled = false;

      /* One entry point for starting a run, used by the automatic first
         play and by Replay alike — so there is exactly one place that
         decides the typing duration and shift, not two that could disagree. */
      const run = async () => {
        const clip = await withTimeout(loadClip(), AUDIO_LOAD_TIMEOUT_MS);
        if (cancelled) return;
        tl?.kill();
        const typeDuration = clip?.duration ?? DEFAULT_TYPE_DURATION;
        const shift = Math.max(0, typeDuration - DEFAULT_TYPE_DURATION);
        tl = build(typeDuration, shift, clip);
        tl.play();
      };

      /* Replay rewinds the performance rather than layering a second one on
         top of it. It is also a genuine user gesture — the one thing that
         can unlock audio a browser would otherwise refuse — so this resumes
         (or, the first time, lazily creates) the audio context synchronously
         inside the click before `run` does anything async. */
      const replay = () => {
        setOrbState("searching");
        void audioCtxRef.current?.resume().catch(() => {});
        void run();
      };
      const button = q("[data-replay]")[0];
      button?.addEventListener("click", replay);

      void run();

      /* ── Leaving ─────────────────────────────────────────────────
         Scrolling past lifts and defocuses the exchange, so the next
         section reads as a sheet sliding over it rather than a cut. */
      const drift = gsap.to(q("[data-core]"), {
        yPercent: -14,
        autoAlpha: 0,
        filter: "blur(10px)",
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      return () => {
        cancelled = true;
        button?.removeEventListener("click", replay);
        drift.scrollTrigger?.kill();
        tl?.kill();
        try {
          sourceRef.current?.stop();
        } catch {
          /* already stopped or never started */
        }
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      /* See the note in `hero-section.tsx`: named for the narration, not
         for a link. */
      id="intro"
      aria-label="Hey Rovyk, what can you do for me?"
      className="relative h-svh w-full overflow-hidden bg-black"
    >
      {/* Pool of light the orb sits in. */}
      <div
        data-glow
        className="bg-intro-glow pointer-events-none absolute inset-0 opacity-0"
      />
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay" />

      {/* Splash. Sits above the exchange and clears out of it. */}
      <div
        data-splash
        className="pointer-events-none absolute inset-0 grid place-items-center opacity-0"
      >
        {/* Stacked inside the cell rather than as two grid children: two
            children of a `place-items-center` grid are two rows sharing the
            height, which would take the mark off centre to make room for a
            line of 10px type. */}
        <div className="flex flex-col items-center">
          <RovykWordmark className="w-[min(44vw,400px)] text-white" />

          {/* The site's small caps without their brackets. Brackets mark an
              eyebrow — a label for the thing under it — and this is a byline
              for the thing above it. Hidden until GSAP raises it, so it is
              not briefly the only thing on a black screen. */}
          <p
            data-byline
            className="mt-5 font-mono text-[10.5px] tracking-[0.16em] text-white/38 uppercase opacity-0"
          >
            A {ENTITY.name} product
          </p>
        </div>
      </div>

      {/* Three rows: the orb row is auto and the rows around it flex, so the
          orb holds centre while text grows away from it in both directions.
          The bottom pad is the footer's zone — the orb centres in what is
          left, rather than in the raw viewport, so the reply never crowds
          the replay control. */}
      <div
        data-core
        className="absolute inset-0 grid grid-rows-[1fr_auto_1fr] justify-items-center px-6 pb-28 sm:px-8"
      >
        {/* Above: the request, transcribed. No container — what separates
            it from the reply is register, not a border: mono against sans,
            the same way an eyebrow is separated from a title everywhere
            else on this page. It earns its place against a 31px line
            beneath it by being a different kind of writing, rather than by
            being fenced off from it.

            The level meter went with the box. The orb directly below is the
            listening indicator — that is the entire claim the orb section
            makes — so a row of bouncing bars beside it was a second one,
            in the idiom every voice product on the internet ships. */}
        <div className="flex w-full max-w-xl flex-col items-center justify-end self-end pb-6 sm:pb-8">
          <div data-ask className="opacity-0">
            {/* Stacked cells: a hidden copy of the full request reserves the
                line's width, so the transcript grows from a fixed left edge
                instead of re-centring itself on every character. */}
            <span className="grid font-mono text-[14px] tracking-[-0.01em] sm:text-base">
              <span
                aria-hidden
                className="invisible col-start-1 row-start-1 whitespace-pre"
              >
                {ASK}
              </span>
              <span className="col-start-1 row-start-1 whitespace-pre text-left">
                <span ref={wakeRef} className="text-brand-indigo-text" />
                <span ref={restRef} className="text-white/92" />
                <span
                  data-caret
                  aria-hidden
                  className="ml-0.5 inline-block h-[0.8em] w-px -translate-y-px animate-caret bg-white/70 align-[-0.06em]"
                />
              </span>
            </span>
          </div>
        </div>

        {/* Centre: the orb. */}
        <div data-orb className="opacity-0">
          <HeroOrb state={orbState} size={ORB_PX} />
        </div>

        {/* Below: the reply. */}
        <div className="flex w-full max-w-xl flex-col items-center gap-4 self-start pt-6 sm:pt-8">
          {REPLY.map((line, i) => (
            <p
              key={i}
              data-reply-line={i}
              className={
                i === 0
                  ? "max-w-[34ch] text-balance text-center text-xl leading-[1.26] tracking-[-0.03em] text-white opacity-0 sm:text-2xl md:text-[31px]"
                  : "max-w-[36ch] text-balance text-center text-base leading-[1.35] tracking-[-0.02em] text-white/68 opacity-0 sm:text-lg md:text-[21px]"
              }
            >
              {line.split(" ").map((word, w) => (
                <span key={w}>
                  <span data-word className="inline-block opacity-0">
                    {word}
                  </span>{" "}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>

      {/* Foot: replay, and the cue that there is more below. Stacked on the
          centre line, in one register — the control keeps the cue's voice
          rather than a border of its own, since it is a demo control and was
          otherwise the loudest thing on the first screen. */}
      <div
        data-foot
        className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-5 opacity-0"
      >
        {/* The negative margin and the padding cancel, so the hit target is
            finger-sized without the label shifting off the centre line. */}
        <button
          data-replay
          type="button"
          className="group/replay pointer-events-auto -m-2 flex items-center gap-2 p-2 font-mono text-xs tracking-[0.22em] text-white/36 uppercase transition-colors duration-200 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowClockwiseIcon
            weight="bold"
            className="size-3 transition-transform duration-500 ease-[cubic-bezier(.52,.52,0,1)] group-hover/replay:-rotate-180"
            aria-hidden
          />
          Replay
        </button>

        <div className="flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-white/36 uppercase">
          {/* <span
            aria-hidden
            className="animate-scroll-cue h-6 w-px bg-linear-to-b from-white to-transparent animate-"
            /> */}
          <CaretDoubleDownIcon
            size={20}
            className="animate-bounce duration-700! "
          />
          Scroll
        </div>
      </div>
    </section>
  );
}
