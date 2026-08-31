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
   ──────────────────────────────────────────────────────────────────── */
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
          CUE.splashIn,
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
          CUE.byline,
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
           the reply arrives, it brightens and holds: the caret goes and the
           line comes up to full. What was said stays on the record for the
           whole section, and one opacity carries that — the border and fill
           that used to firm up alongside it were the same beat, said twice
           in furniture. */
        .to(caret, { autoAlpha: 0, duration: 0.3 }, CUE.settle)
        .to(
          askLine,
          { autoAlpha: 1, duration: 0.55, ease: "power2.out" },
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
