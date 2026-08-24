"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { OrbState } from "thinking-orbs/engine";
import {
  ArrowClockwiseIcon,
  MicrophoneIcon,
} from "@phosphor-icons/react/dist/ssr";
import { RovykWordmark } from "@/components/rovyk-wordmark";
import { HeroOrb } from "@/components/hero-orb";

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

/**
 * Canvas is rasterised once at this size and scaled *down* in CSS, so the orb
 * is never upsampled — it reaches full size only while composing, leaning into
 * the slot it already occupies.
 */
const ORB_PX = 200;
const ORB_REST = 0.86;

/** Level meter beside the question. Decorative — nothing is being recorded. */
const BARS = [0.4, 0.75, 1, 0.65, 0.35];

/* ── Cue sheet ────────────────────────────────────────────────────────
   Absolute seconds, not relative offsets. Every beat is positioned
   against the timeline origin so that retiming one step cannot cascade
   into the others, and so the whole performance can be read at a glance.
   ──────────────────────────────────────────────────────────────────── */
const CUE = {
  splashIn: 0.25,
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

const TYPE_RATE = 0.036; // seconds per character

export function IntroSection() {
  const [orbState, setOrbState] = useState<OrbState>("searching");
  const root = useRef<HTMLElement>(null);
  const wakeRef = useRef<HTMLSpanElement>(null);
  const restRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

      const splash = q("[data-splash]");
      const letters = q("[data-letter]");
      const glow = q("[data-glow]");
      const orb = q("[data-orb]");
      const askLine = q("[data-ask]");
      const chip = q("[data-chip]");
      const halo = q("[data-halo]");
      const caret = q("[data-caret]");
      const bars = q("[data-bar]");
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

      /* The chip's resting and committed skins. Transcribing is dim and
         provisional; once the request lands it brightens and stays — it is a
         record of what was said, not a transient caption. */
      const CHIP_LIVE = {
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.03)",
      };
      const CHIP_DONE = {
        borderColor: "rgba(255,255,255,0.22)",
        backgroundColor: "rgba(255,255,255,0.06)",
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
        gsap.set(bars, { scaleY: 0.22 });
        gsap.set([caret, halo], { autoAlpha: 0 });
        gsap.set(chip, CHIP_DONE);
        writeAsk(ASK.length);
        return;
      }

      const typed = { chars: 0 };
      const tl = gsap.timeline({ paused: true });

      tl
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
        .set(chip, CHIP_LIVE, 0)
        .set(halo, { autoAlpha: 0 }, 0)
        .set(replyWords, { autoAlpha: 0, y: "0.35em", filter: "blur(6px)" }, 0)
        .set(caret, { autoAlpha: 1 }, 0)
        .set(bars, { scaleY: 0.22 }, 0)
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
          CUE.splashIn,
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
          CUE.splashOut,
        )

        /* ── The room lights ─────────────────────────────────────── */
        .to(
          glow,
          { autoAlpha: 1, duration: 1.6, ease: "power2.out" },
          CUE.lights,
        )
        .to(
          orb,
          {
            autoAlpha: 1,
            scale: ORB_REST,
            duration: 1.1,
            ease: "back.out(1.4)",
          },
          CUE.orbIn,
        )

        /* ── The question, transcribed ───────────────────────────────
           Character by character with a caret, deliberately unlike the
           reply below: this is speech being written down as it lands,
           not prose being composed. */
        .call(() => setOrbState("listening"), undefined, CUE.listen)
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
          CUE.listen,
        )
        /* Live-mic halo: breathes only while the mic is actually open. */
        .to(
          halo,
          {
            autoAlpha: 0.55,
            duration: 0.9,
            ease: "sine.inOut",
            repeat: 1,
            yoyo: true,
          },
          CUE.listen + 0.2,
        )
        .to(
          bars,
          {
            scaleY: () => gsap.utils.random(0.35, 1),
            duration: 0.28,
            ease: "sine.inOut",
            stagger: { each: 0.06, from: "center" },
            repeat: 2,
            repeatRefresh: true,
          },
          CUE.listen,
        )
        .fromTo(
          typed,
          { chars: 0 },
          {
            chars: ASK.length,
            duration: ASK.length * TYPE_RATE,
            ease: "none",
            onUpdate: () => writeAsk(typed.chars),
          },
          CUE.type,
        )

        /* ── Commit ──────────────────────────────────────────────────
           The request lands. Rather than fading into the background once
           the reply arrives, the chip brightens and holds: the caret and
           the halo go, the meter settles, the border firms up. What was
           said stays on the record for the whole section. */
        .to(
          bars,
          { scaleY: 0.22, duration: 0.4, ease: "power2.out" },
          CUE.settle,
        )
        .to([caret, halo], { autoAlpha: 0, duration: 0.3 }, CUE.settle)
        .to(
          askLine,
          { autoAlpha: 1, duration: 0.55, ease: "power2.out" },
          CUE.settle,
        )
        .to(
          chip,
          { ...CHIP_DONE, duration: 0.55, ease: "power2.out" },
          CUE.settle,
        )

        /* ── Thinking ────────────────────────────────────────────── */
        .call(() => setOrbState("solving"), undefined, CUE.think)

        /* ── The reply, composed ─────────────────────────────────────
           Word by word rather than character by character. It reads as
           language arriving in units of meaning, and it is the exact
           structure per-word audio timestamps will drive later. */
        .call(() => setOrbState("composing"), undefined, CUE.reply)
        .to(orb, { scale: 1, duration: 0.9, ease: "power2.out" }, CUE.reply)
        .set(replyLines, { autoAlpha: 1 }, CUE.reply)
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
          CUE.reply,
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
          CUE.replyTail,
        )

        /* ── Rest ─────────────────────────────────────────────────────
           Back to the dense globe rather than the ring: at hero scale the
           ring reads as a loading spinner, the globe reads as the orb. */
        .call(() => setOrbState("searching"), undefined, CUE.rest)
        .to(
          orb,
          { scale: ORB_REST, duration: 1.1, ease: "power2.inOut" },
          CUE.rest,
        )
        .to(
          foot,
          { autoAlpha: 1, duration: 0.9, ease: "power2.out" },
          CUE.rest + 0.2,
        );

      /* Replay rewinds the performance rather than layering a second one
         on top of it. */
      const replay = () => {
        setOrbState("searching");
        tl.restart(true);
      };
      const button = q("[data-replay]")[0];
      button?.addEventListener("click", replay);

      tl.play();

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
        button?.removeEventListener("click", replay);
        drift.scrollTrigger?.kill();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
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
        <RovykWordmark className="w-[min(44vw,400px)] text-white" />
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
        {/* Above: the request, as a transcript chip. Deliberately an object
            on the screen rather than floating text — it has to survive the
            arrival of a 31px reply directly beneath it. */}
        <div className="flex w-full max-w-xl flex-col items-center justify-end self-end pb-6 sm:pb-8">
          <div data-ask className="opacity-0">
            <div
              data-chip
              className="relative inline-flex items-center gap-3 rounded-full border px-4 py-2 font-mono text-[11.5px] tracking-tight sm:gap-3.5 sm:px-4.5 sm:text-[13.5px]"
            >
              {/* Live-mic halo. Pink is the palette's voice signal. */}
              <span
                data-halo
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-full opacity-0 ring-1 ring-brand-pink/45"
              />
              <MicrophoneIcon
                weight="regular"
                className="size-3.5 shrink-0 text-white/45"
                aria-hidden
              />
              <span aria-hidden className="flex h-3.5 items-center gap-0.75">
                {BARS.map((h, i) => (
                  <span
                    key={i}
                    data-bar
                    style={{ height: `${h * 100}%` }}
                    className="w-px origin-center rounded-full bg-brand-pink-text/70"
                  />
                ))}
              </span>
              {/* Stacked cells: a hidden copy of the full request reserves the
                  line's width, so the mic and meter hold still while the text
                  types instead of being shoved left by every character. */}
              <span className="grid">
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

      {/* Foot: replay, and the cue that there is more below. */}
      <div
        data-foot
        className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-5 opacity-0"
      >
        <button
          data-replay
          type="button"
          className="pointer-events-auto inline-flex h-9 items-center gap-2.5 rounded-full border border-input px-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/55 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowClockwiseIcon weight="bold" className="size-3" aria-hidden />
          Replay
        </button>

        <div className="flex flex-col items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/36">
          <span
            aria-hidden
            className="animate-scroll-cue h-6 w-px bg-linear-to-b from-white/30 to-transparent"
          />
          Scroll
        </div>
      </div>
    </section>
  );
}
