"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { OrbState } from "thinking-orbs/engine";
import { HeroOrb } from "@/components/hero-orb";
import { useVoice } from "@/components/voice/voice-provider";
import { SECTION_LABEL, cueOf, toCues } from "@/lib/voice-script";
import { EDGE_LIGHT } from "@/lib/notch";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The voice dock: the orb is the control, and the words come out of it.

   Chosen from twelve surfaces, on one property none of the others had
   both halves of: **you press a thing and that same thing changes.**

   Earlier attempts each failed it a different way. A tab in the top
   right that opened a panel one row below was two objects with a step
   between them, in the corner where notifications live — and fighting
   that association is a permanent tax. Moving the words to the floor as
   subtitles read beautifully and left the control eight hundred pixels
   away from its own effect.

   Here the orb sits at the bottom right and stays put. Press it and the
   transcript unfurls to its left; press it again and it folds away. The
   orb never moves, because the panel grows from the anchored edge — the
   thing you just touched is not allowed to jump out from under you.

   ── What this bought, beyond the interaction ─────────────────────
   Three things stop being problems rather than being solved:

   - **The nav.** Nothing lives in the top edge any more, so the whole
     one-open-object-at-a-time rule, the parking transform and the
     listener on the nav are gone. The rail can open to any width it
     likes.
   - **Touch.** The bottom right is thumb-reachable, both top corners
     are free for the touch nav's own tabs, and the panel simply gets
     narrower. This is the first version that did not need a second
     design for phones.
   - **The product's own HUD.** The `how` section renders the real notch
     a few hundred pixels away. A dock at the floor is a different
     register and does not compete with it.

   What it costs: this is a media player, not a menu-bar item. The
   macOS metaphor is gone. That was judged worth the trade.
   ──────────────────────────────────────────────────────────────────── */

/**
 * How wide the transcript gets, and why exactly this wide.
 *
 * Measured, not guessed, and re-measured when the type grew. Across all
 * fourteen recorded tracks the cue builder produces 36 cues; the longest
 * runs 156 characters. At `text-lg` that cue needs a 420px column to
 * stay within three lines — and this figure is the *container*, which
 * carries 26px of its own padding, so the column is 26 less than
 * whatever is written here. Hence 460, not 420: the number that looks
 * right is the one that leaves 434px of actual text.
 *
 * Bounded by the viewport so a phone gets a narrower dock rather than a
 * horizontal scrollbar — there it wraps to more lines, which is the
 * right trade on a screen that has the height to spare.
 */
const TEXT_W = "min(460px, calc(100vw - 2 * var(--gut) - 104px))";

/**
 * Three lines, held — but only where three lines is enough.
 *
 * Expressed in `lh` rather than pixels, so it is literally "three lines"
 * and not a number that happened to equal three lines at one type size.
 * It was 63px, which was three lines at 14px, and stopped being three
 * of anything the moment the caption grew.
 *
 * The dock does not resize per cue: a box that breathed with every
 * sentence would be the most restless thing on the page.
 *
 * That only works while the column is wide. On a phone it is about
 * 246px, the longest cue runs well past three lines, and a held height
 * would simply cut it in half — so below `sm` the height is released
 * and the dock grows to fit. Restless, but never clipped, and a phone
 * has the vertical room to spare.
 */
const CAPTION_LINES = 3;

/**
 * The offer.
 *
 * "Hey Rovyk" was the wake word, which is a fact about the Mac app and
 * not a reason to press anything on a web page.
 *
 * This offers an alternative rather than an addition, which is the right
 * footing for a page whose audience is sceptical by definition: it does
 * not presume the reader is confused, it does not promise more than the
 * scripts deliver, and it does not ask them to add anything to what they
 * were already doing. They can carry on reading and it costs them
 * nothing that they did not.
 */
const CTA = "Listen Instead";

/* ── The orb ──────────────────────────────────────────────────────── */

function MarkOrb({ size }: { size: number }) {
  const { player, speaking, awake } = useVoice();
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!speaking) return;
    return player.onTick(({ level: next }) => setLevel(next));
  }, [player, speaking]);

  const state: OrbState = speaking
    ? "composing"
    : awake
      ? "listening"
      : "searching";

  /* Never paused. `<HeroOrb>` cancels its loop the moment `paused` is
     set, and a loop cancelled before its first frame leaves an empty
     canvas — the asleep dock was a word with nothing beside it. It stops
     itself off-screen anyway, and idle is the cheapest geometry the
     library draws. */
  return <HeroOrb state={state} size={size} amplitude={speaking ? level : 0} />;
}

/* ── The caption ──────────────────────────────────────────────────── */

function Caption() {
  const { player, speaking } = useVoice();
  const [word, setWord] = useState(-1);

  useEffect(() => {
    if (!speaking) return;
    return player.onWord((f) => setWord(f.word));
  }, [player, speaking]);

  const alignment = player.alignment;
  const cues = useMemo(() => (alignment ? toCues(alignment) : []), [alignment]);
  if (!alignment || !cues.length) return null;

  const index = cueOf(cues, word);
  const cue = cues[index];

  return (
    <div
      style={{ "--cap-h": `${CAPTION_LINES}lh` } as CSSProperties}
      className="flex items-center sm:h-(--cap-h) sm:overflow-hidden"
    >
      {/* Keyed on the cue, so a new one arrives as a new element and
          lifts in rather than mutating the old one under the reader.

          Two tones, not three. Past / present / unspoken was
          indistinguishable at this size on black and read as words
          dimmed at random rather than as a voice moving through a
          sentence. */}
      <p
        key={index}
        className="animate-in fade-in slide-in-from-bottom-1 text-lg leading-normal font-light tracking-[-0.008em] duration-300 motion-reduce:animate-none"
      >
        {alignment.words.slice(cue.start, cue.end).map((w, i) => (
          <span
            key={cue.start + i}
            className={cn(
              "transition-colors duration-200 motion-reduce:transition-none",
              cue.start + i <= word ? "text-white/95" : "text-white/26",
            )}
          >
            {w.w}{" "}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * How much is left, drawn around the orb.
 *
 * Every other shape in this language carries a lit underside, and that
 * is where the earlier versions put the progress. A pill has no straight
 * underside to run one along — it lands in the curve and disappears.
 *
 * A ring is the better answer anyway, and it is not a new idea: the
 * product's own HUD already draws one (`rovyk-hud.tsx`). It puts the
 * remaining time on the control, which is exactly where a hand goes when
 * it has heard enough.
 *
 * Written straight to a style, so a value that changes every frame costs
 * no render.
 */
/* Close enough to the orb to read as its ring rather than as a circle
   drawn near it: 46px around a 40px orb is three pixels of clearance. */
const RING_R = 23;
const RING_C = 2 * Math.PI * RING_R;

function Ring() {
  const { player, speaking } = useVoice();
  const arc = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (arc.current) arc.current.style.strokeDashoffset = String(RING_C);
    if (!speaking) return;
    return player.onTick(({ progress }) => {
      if (arc.current) {
        arc.current.style.strokeDashoffset = String(RING_C * (1 - progress));
      }
    });
  }, [player, speaking]);

  return (
    <svg
      viewBox={`0 0 ${KNOB} ${KNOB}`}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 size-full -rotate-90 transition-opacity duration-300",
        speaking ? "opacity-100" : "opacity-0",
      )}
    >
      <circle
        ref={arc}
        cx={KNOB / 2}
        cy={KNOB / 2}
        r={RING_R}
        fill="none"
        stroke={`rgba(255,255,255,${EDGE_LIGHT})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={RING_C}
        style={{ strokeDashoffset: RING_C }}
      />
    </svg>
  );
}

/* ── The dock ─────────────────────────────────────────────────────── */

/**
 * The orb, resting.
 *
 * Which mode the voice is in is a fact about the orb, so the orb is
 * where it should be legible: small and quiet while there is nothing to
 * say, full size while it is talking. Nothing else in the dock changes
 * size to say it.
 *
 * Done by scaling *down* from a canvas drawn at the larger size, never
 * up. `<HeroOrb>` rasters at up to twice its CSS size, so a 40px orb
 * held at 0.8 is an 80px raster shown at 32 — two and a half times
 * oversampled, and sharper at rest than it is speaking. Scaling up
 * would be the same trick with the softness put in the wrong place.
 */
const ORB_SIZE = 40;
const ORB_REST = 0.8;

/**
 * The three shapes, as widths and heights.
 *
 * Computed rather than measured after the fact, because the alternative
 * is a frame where the box is one size and the browser has already
 * painted it. The knob and the frame are fixed; only the content varies,
 * and the content's own size is read once per state.
 */
/* Sized around the orb rather than the other way round: the ring has to
   clear it, and at a 40px orb a 44px knob left the ring drawing *inside*
   the dots. */
const KNOB = 52;
const PAD = 4; // p-1
const BORDER = 1.5;
const SHUT = KNOB + PAD * 2 + BORDER * 2; // 62 — a circle at this radius

export function VoiceHud() {
  const { awake, speaking, toggle, sleep } = useVoice();

  const shell = useRef<HTMLDivElement>(null);
  const orb = useRef<HTMLSpanElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const offer = useRef<HTMLSpanElement>(null);

  const state = speaking ? "speaking" : awake ? "awake" : "off";

  /* ── The morph ────────────────────────────────────────────────────
     GSAP owns the box; nothing else animates size.

     The contents are always at their natural size and never resized —
     the shell simply clips them, and because its children are packed to
     the right, whatever does not fit spills off the left edge and is
     cut. So growing the shell *wipes* the transcript into view rather
     than stretching a box that text then reflows inside, which is what
     the CSS version did and why the words shuffled while it opened.

     Width and height are tweened on their own curves: the box widens
     first and settles into its height a beat later, which is what makes
     it read as unfolding rather than inflating. Sizes are cleared when
     the tween lands, so a resize or a longer cue is measured fresh.
     ────────────────────────────────────────────────────────────────── */
  /** What the shell should be, right now, for the state it is in. */
  const measure = useCallback(() => {
    const w =
      state === "speaking"
        ? SHUT + (words.current?.offsetWidth ?? 0)
        : state === "off"
          ? SHUT + (offer.current?.offsetWidth ?? 0)
          : SHUT;
    const h =
      state === "speaking"
        ? Math.max(
            SHUT,
            (words.current?.offsetHeight ?? 0) + PAD * 2 + BORDER * 2,
          )
        : SHUT;
    return { w, h };
  }, [state]);

  useGSAP(
    () => {
      const el = shell.current;
      if (!el) return;

      const { w, h } = measure();
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        gsap.set(el, { width: w, height: h });
        gsap.set(orb.current, { scale: state === "speaking" ? 1 : ORB_REST });
        return;
      }

      /* Width leads and height follows a beat later, which is what makes
         it read as unfolding rather than inflating. */
      gsap
        .timeline()
        .to(el, { width: w, duration: 0.62, ease: "power3.inOut" }, 0)
        .to(el, { height: h, duration: 0.52, ease: "power3.inOut" }, 0.06)
        /* The orb swells as the box opens and settles back as it
           shuts. Slightly longer than the box and on a softer curve, so
           it is felt after the unfolding is seen rather than competing
           with it. A little overshoot on the way up, because this is
           the moment the thing starts talking and a flat ease reads as
           a resize rather than as a breath. */
        .to(
          orb.current,
          {
            scale: state === "speaking" ? 1 : ORB_REST,
            duration: 0.7,
            ease: state === "speaking" ? "back.out(1.6)" : "power2.inOut",
          },
          0,
        );
    },
    { dependencies: [state, measure], scope: shell },
  );

  /* ── Retargeting ──────────────────────────────────────────────────
     The transcript's height is not known when the morph starts.
     `speaking` is set before `player.play()` has resolved, so on the
     frame the shell begins opening the alignment has not arrived and
     the caption is still empty — the box would open to the height of a
     single label row and stay there, because `state` never changes
     again to retrigger the tween.

     Watching the content instead of guessing at it also covers the two
     other ways this height moves: a cue that wraps to more lines on a
     narrow window, and the window itself being resized mid-sentence.
     ────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = shell.current;
    const content = words.current;
    if (!el || !content) return;

    const observer = new ResizeObserver(() => {
      const { w, h } = measure();
      if (Math.abs(el.offsetWidth - w) < 1 && Math.abs(el.offsetHeight - h) < 1) {
        return;
      }
      gsap.to(el, { width: w, height: h, duration: 0.42, ease: "power3.out" });
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      data-voice-hud
      className="pointer-events-none fixed right-8 bottom-8 z-95 flex justify-end"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="pointer-events-auto relative">
        {/* ── The pool of light ────────────────────────────────────
            Black on near-black is invisible, which is what the dock was.
            The page's own answer to this is a bloom — the intro sits its
            orb in one and the closing section does the same. It makes a
            dark object findable without a border bright enough to read
            as a button. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-8 -z-10 transition-opacity duration-500",
            speaking ? "opacity-70" : "opacity-100",
          )}
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,255,255,.10), transparent 78%)",
          }}
        />

        <div
          ref={shell}
          className={cn(
            /* One radius for all three shapes. At 54px square it is
               exactly a circle; at any larger size the same number is a
               rounded rectangle. So the corner is never animated — only
               the box is, and the shape follows.

               `justify-end` with `overflow-hidden` is what makes the
               clip work: children pack against the orb, and anything
               too wide spills off the left and is cut. */
            "relative flex items-center justify-end overflow-hidden rounded-4xl border bg-card p-1",
            "transition-colors duration-500",
            speaking ? "border-white/10" : "border-white/22",
          )}
          style={{ width: SHUT, height: SHUT }}
        >
          {/* The transcript, always at its natural size. The shell
              reveals it; it never resizes to be revealed. */}
          <div
            ref={words}
            role="status"
            aria-live="off"
            inert={!speaking}
            /* Out of the flow when it is not the thing being shown, not
               merely invisible. Absolute rather than unmounted so it can
               still be measured: the shell's target size is read off
               these two, and a `display: none` block measures zero. */
            className={cn(
              "shrink-0 p-2 transition-opacity duration-300 motion-reduce:transition-none",
              speaking
                ? "relative opacity-100"
                : "pointer-events-none absolute opacity-0",
            )}
            style={{ width: TEXT_W }}
          >
            {/* What this is about, and the way out. The orb toggles too,
                but a control whose only affordance is "press the thing
                you pressed to start it" is a control nobody finds. */}
            <div className="mb-1.5 flex items-baseline gap-3 font-mono text-xs tracking-[0.14em] uppercase">
              <span className="truncate text-white/34">
                {speaking ? SECTION_LABEL[speaking.section] : ""}
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={sleep}
                className="shrink-0 cursor-pointer rounded-sm text-white/45 uppercase transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Stop
              </button>
            </div>
            <Caption />
          </div>

          {/* One control, not a button with a caption next to it.

              The label used to sit outside the button, which meant the
              pill looked pressable and only the orb on the end of it
              was — a target 52px wide inside a shape three times that.
              Both are inside now, so pressing anywhere on the pill is
              pressing the thing it is offering.

              Speaking, the label is out of the flow and the button is
              back to being the orb, which is the whole of what is left
              to press. */}
          <button
            type="button"
            onClick={toggle}
            aria-pressed={awake}
            /* Named explicitly: `<HeroOrb>` is a labelled `img` and would
               otherwise put its own "Rovyk" into this button's name.

               Shut, the name carries the visible words, because the
               label inside it is hidden from a screen reader and WCAG
               asks that what is seen be part of what is announced.
               Speaking, there are no visible words, so it just says what
               pressing it does. */
            aria-label={
              awake ? "Stop the narration" : `${CTA}. Start the narration.`
            }
            className={cn(
              "relative flex shrink-0 cursor-pointer items-center rounded-4xl",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              /* The button sits inside the shell's padding box, which
                 left a 5px rim of pill that looked pressable and was
                 not — 4px of padding and the border. This reaches over
                 it. Only while the pill *is* the control: speaking, the
                 shell is mostly transcript and a target that spilled
                 past the orb would swallow presses meant for the words
                 or for Stop. */
              !speaking && "before:absolute before:-inset-1.25 before:rounded-4xl",
            )}
          >
            {/* The offer. Inside the shape, because a label floating
                beside it read as something stuck to the outside of the
                object rather than part of it. */}
            <span
              ref={offer}
              aria-hidden
              className={cn(
                "shrink-0 pr-2.5 pl-3.5 text-sm font-light tracking-[-0.01em] whitespace-nowrap text-white/72",
                "transition-opacity duration-300 motion-reduce:transition-none",
                awake
                  ? "pointer-events-none absolute opacity-0"
                  : "relative opacity-100",
              )}
            >
              {CTA}
            </span>

            <span className="relative grid size-13 shrink-0 place-items-center">
              {/* The scale lives on a wrapper rather than on the canvas,
                  so the ring around it keeps its own geometry — the ring
                  only shows while speaking, when the orb is at full size
                  anyway. */}
              <span ref={orb} className="block origin-center">
                <MarkOrb size={ORB_SIZE} />
              </span>
              <Ring />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
