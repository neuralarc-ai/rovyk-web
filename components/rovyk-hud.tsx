"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { OrbState } from "thinking-orbs/engine";
import {
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  GearSixIcon,
  MicrophoneIcon,
  PowerIcon,
  PushPinIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { HeroOrb } from "@/components/hero-orb";
import { MAIL_FLOW, type HudFlow } from "@/lib/hud-flows";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ────────────────────────────────────────────────────────────────────
   The notch HUD: one full run of work, on a loop.

   The point of the whole hero is "agency, not chat" — so this is not a
   chat bubble. It is the notch growing from an idle sliver into a task
   runner, doing a chain of real steps, stopping at a confirmation gate
   before the irreversible one, and shrinking back. Four sizes, one
   continuous shape.

   Which run it plays is a prop. This file knows how the notch narrates
   work — the sizes, the tones, the beat lengths — and nothing about any
   particular errand; those live in `lib/hud-flows.ts`.
   ──────────────────────────────────────────────────────────────────── */

type HudView = "notch" | "compact" | "exp" | "idle";
type Tone = "idle" | "on" | "work" | "say";

/**
 * One held moment of a run, rather than the whole loop. The "how it works"
 * section walks these one at a time, so the HUD has to be able to sit at a
 * beat and stay there instead of always playing through.
 */
export type HudBeat = "listening" | "thinking" | "gate" | "speaking";

/** The notch's four sizes. Width and radius are fixed per view; height is
 *  not — expanded, it depends on how long the flow's chain is. */
const VIEW_SHELL: Record<HudView, string> = {
  notch: "w-[156px] rounded-b-xl",
  compact: "w-[192px] rounded-b-2xl",
  exp: "w-[368px] rounded-b-3xl",
  idle: "w-[272px] rounded-b-2xl",
};

const VIEW_H: Record<Exclude<HudView, "exp">, number> = {
  notch: 26,
  compact: 46,
  idle: 74,
};

/* Expanded, the shell was drawn around a four-step chain, and everything
   below — the transcript's four lines, the gate hanging just out of sight —
   is balanced against that. So rather than rebuild the geometry from parts,
   a longer chain grows both the shell and the body by exactly the rows it
   adds; a four-step flow gets the drawn numbers back, untouched.

   The body has to be grown explicitly. The gate is always laid out, merely
   clipped, so `flex-1` alone leaves the chain squeezed against its floor
   and the last step falls off the bottom. */
const EXP_H = 118;
const EXP_BODY_H = 64;
/** One 10.5px row at 1.2 leading, plus the gap under it. */
const EXP_ROW = 16.6;
const BASE_ROWS = 4;
/** How much the gate adds when it opens. */
const GATE_H = 68;

/** Height the chain needs beyond what the shell was drawn to hold. */
const chainOverflow = (tasks: number) =>
  Math.ceil(Math.max(0, tasks - BASE_ROWS) * EXP_ROW);

const expHeight = (tasks: number, gateOpen: boolean) =>
  EXP_H + chainOverflow(tasks) + (gateOpen ? GATE_H : 0);

/**
 * Where the ring sits once `n` of the chain's steps have landed. It climbs
 * to 90% across the chain and only closes once the gate has been answered:
 * a run still waiting on a human is not a finished run.
 */
const chainRing = (n: number, total: number) => 0.18 + (0.72 * n) / total;

/** Corner fillets scale with the body, or the join stops reading as carved. */
const VIEW_FILLET: Record<HudView, string> = {
  notch: "size-[11px]",
  compact: "size-[15px]",
  exp: "size-[19px]",
  idle: "size-[15px]",
};

const TONE: Record<Tone, string> = {
  idle: "text-white/50",
  on: "text-white/88",
  work: "text-brand-indigo-text",
  say: "text-brand-pink",
};

/* Derived, not measured: change the radius and the arc still tracks. */
const RING_R = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

type HudState = {
  view: HudView;
  orb: OrbState;
  label: string;
  tone: Tone;
  transcript: string;
  /** Styles the transcript: a request, a status, or the spoken answer. */
  variant: "said" | "thinking" | "speaking";
  typing: boolean;
  shown: number;
  done: number;
  ring: number;
  gate: boolean;
};

const START: HudState = {
  view: "notch",
  orb: "searching",
  label: "Idle",
  tone: "idle",
  transcript: "",
  variant: "said",
  typing: false,
  shown: 0,
  done: 0,
  ring: 0.18,
  gate: false,
};

function ChromeIcon({
  as: Icon,
  dim,
  danger,
}: {
  as: typeof MicrophoneIcon;
  dim?: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={cn(
        "grid size-5.5 shrink-0 place-items-center",
        danger ? "text-brand-red" : dim ? "text-white/34" : "text-white/42",
      )}
    >
      <Icon weight="regular" className="size-[12.5px]" aria-hidden />
    </span>
  );
}

/** Where the HUD sits at a given beat, derived from whatever flow it holds. */
function beatState(flow: HudFlow, beat: HudBeat): HudState {
  const total = flow.tasks.length;
  const base = { ...START, view: "exp" as const };
  switch (beat) {
    case "listening":
      return {
        ...base,
        orb: "listening",
        label: "Listening",
        tone: "on",
        variant: "said",
        typing: true,
      };
    case "thinking":
      return {
        ...base,
        orb: "solving",
        label: "Thinking",
        tone: "work",
        transcript: flow.planning,
        variant: "thinking",
      };
    case "gate":
      return {
        ...base,
        orb: "working",
        label: "Thinking",
        tone: "work",
        transcript: flow.planning,
        variant: "thinking",
        shown: total,
        done: total - 1,
        ring: chainRing(total, total),
        gate: flow.gate !== null,
      };
    case "speaking":
      return {
        ...base,
        orb: "composing",
        label: "Speaking",
        tone: "say",
        transcript: flow.spoken,
        variant: "speaking",
        shown: total,
        done: total,
        ring: 1,
      };
  }
}

export function RovykHud({
  flow = MAIL_FLOW,
  beat,
  className,
}: {
  /** The run to play. See `lib/hud-flows.ts`. */
  flow?: HudFlow;
  /**
   * Hold one beat of that run instead of looping it. The looping timeline is
   * not built at all in this mode — the caller is driving.
   */
  beat?: HudBeat;
  className?: string;
}) {
  const [s, setS] = useState<HudState>(START);
  const root = useRef<HTMLDivElement>(null);
  const patch = (next: Partial<HudState>) =>
    setS((prev) => ({ ...prev, ...next }));

  useGSAP(
    () => {
      const total = flow.tasks.length;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* Driven from outside: land on the beat, and play only the small part
         of it that is still in motion. No loop, no ScrollTrigger. */
      if (beat) {
        setS(beatState(flow, beat));
        if (reduced || beat === "gate" || beat === "speaking") return;

        const tl = gsap.timeline();
        if (beat === "listening") {
          const cursor = { n: 0 };
          tl.fromTo(
            cursor,
            { n: 0 },
            {
              n: flow.request.length,
              duration: flow.request.length * 0.034,
              ease: "none",
              onUpdate: () =>
                patch({
                  transcript: flow.request.slice(0, Math.round(cursor.n)),
                }),
              onComplete: () => patch({ typing: false }),
            },
            0.24,
          );
        } else {
          /* The chain lands step by step, stopping one short — the last one
             is what the gate in the next beat is about. */
          for (let i = 1; i < total; i++)
            tl.call(
              () => patch({ shown: i, done: i - 1, ring: chainRing(i, total) }),
              undefined,
              0.3 + (i - 1) * 0.52,
            );
          tl.call(
            () => patch({ shown: total - 1, done: total - 1 }),
            undefined,
            0.3 + (total - 1) * 0.52,
          );
        }
        return () => void tl.kill();
      }

      if (reduced) {
        // A single legible frame: two steps from the end, gate open, so the
        // still image still says "it does work and it asks first".
        const done = Math.max(1, total - 2);
        setS({
          view: "exp",
          orb: "working",
          label: "Thinking",
          tone: "work",
          transcript: flow.planning,
          variant: "thinking",
          typing: false,
          shown: Math.min(total, done + 1),
          done,
          ring: chainRing(done + 1, total),
          gate: flow.gate !== null,
        });
        return;
      }

      const tl = gsap.timeline({ repeat: -1, paused: true });

      /* A running cursor rather than relative offsets. `+=` and `-=` are
         measured from the timeline's end, so one long child silently pushes
         every later beat — this keeps each step's position explicit. */
      let at = 0;
      const step = (fn: () => void, hold: number) => {
        tl.call(fn, undefined, at);
        at += hold;
      };
      const type = (text: string, rate: number, hold: number) => {
        const cursor = { n: 0 };
        tl.fromTo(
          cursor,
          { n: 0 },
          {
            n: text.length,
            duration: text.length * rate,
            ease: "none",
            onUpdate: () =>
              patch({ transcript: text.slice(0, Math.round(cursor.n)) }),
          },
          at,
        );
        at += text.length * rate + hold;
      };

      /* Asleep in the menu bar. */
      step(() => setS(START), 2.4);

      /* Wakes on the wake word. */
      step(
        () =>
          patch({
            view: "compact",
            orb: "listening",
            label: "Listening",
            tone: "on",
          }),
        1.7,
      );

      /* Opens up to show its work, and transcribes what it heard. */
      step(
        () =>
          patch({
            view: "exp",
            label: "Listening",
            tone: "on",
            transcript: "",
            variant: "said",
            typing: true,
          }),
        0.26,
      );
      type(flow.request, 0.034, 0.65);
      step(() => patch({ typing: false }), 0);

      /* Plans, then runs the chain — each task lands, then completes. */
      step(
        () =>
          patch({
            orb: "solving",
            label: "Thinking",
            tone: "work",
            transcript: flow.planning,
            variant: "thinking",
          }),
        0.35,
      );
      for (let i = 1; i <= total; i++) {
        step(() => {
          patch({ shown: i, done: i - 1, ring: chainRing(i, total) });
          if (i === 2) patch({ orb: "working" });
        }, 0.52);
        /* The last step is held open: it is the one the gate is about, and
           it does not land until the gate has been answered. */
        step(() => patch({ done: i < total ? i : total - 1 }), 0.22);
      }

      /* The gate. Nothing irreversible happens without this, and it is
         deterministic — not the model's call. A flow with nothing to
         confirm goes straight to the finished chain. */
      if (flow.gate) step(() => patch({ gate: true }), 2.6);
      step(
        () => patch({ shown: total, done: total, gate: false, ring: 1 }),
        0.5,
      );

      /* Reports back, out loud. */
      step(
        () =>
          patch({
            orb: "composing",
            label: "Speaking",
            tone: "say",
            transcript: flow.spoken,
            variant: "speaking",
          }),
        3.6,
      );

      /* Folds away. */
      step(
        () =>
          patch({
            view: "compact",
            label: "Idle",
            tone: "idle",
            orb: "searching",
          }),
        0.9,
      );
      step(() => patch({ view: "idle", shown: 0, done: 0 }), 1.9);

      /* Only runs while it is on screen — this is ambient, not important
         enough to burn frames in a background tab. */
      const trigger = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: ({ isActive }) => (isActive ? tl.play() : tl.pause()),
      });

      return () => trigger.kill();
    },
    { scope: root, dependencies: [flow, beat], revertOnUpdate: true },
  );

  /* Driven mode keeps the column open across every beat: stepping from
     "listening" to "thinking" should not also resize the shell sideways. */
  const hasTasks = beat ? true : s.shown > 0;

  return (
    <div
      ref={root}
      aria-hidden
      className={cn(
        // Above the menu bar, not behind it: the notch is display hardware
        // that the menu bar flows around. Behind it, the bar's backdrop-blur
        // samples the notch and smears the interface into a grey blob.
        "absolute top-0 left-1/2 z-30 flex -translate-x-1/2 items-start",
        // The notch is laid out in fixed pixels, because it is a rendering of
        // a real piece of macOS chrome — expanded it is 404px wide. It is the
        // caller that knows how big the machine it hangs in is, so the scale
        // comes in through `className`, anchored to the edge it hangs from.
        "origin-top",
        className,
      )}
    >
      {/* Left fillet — the concave corner that carves the notch out of the
          top edge instead of hanging a pill below it. */}
      <span
        className={cn(
          "mask-fillet-tl -mr-px shrink-0 bg-black transition-[width,height] duration-[550ms] ease-[cubic-bezier(.22,1,.36,1)]",
          VIEW_FILLET[s.view],
        )}
      />

      <div
        style={{
          height:
            s.view === "exp"
              ? expHeight(flow.tasks.length, s.gate)
              : VIEW_H[s.view],
        }}
        className={cn(
          "relative overflow-hidden bg-black transition-[width,height,border-radius] duration-[580ms] ease-[cubic-bezier(.22,1,.36,1)]",
          VIEW_SHELL[s.view],
        )}
      >
        {/* ── Sliver: just a pulse and a word ─────────────────────── */}
        <View
          on={s.view === "notch"}
          className="flex items-center justify-between px-2"
        >
          <HeroOrb state={s.orb} size={14} paused={s.view !== "notch"} />
          <span className={cn("text-[8px] font-medium", TONE[s.tone])}>
            {s.label}
          </span>
        </View>

        {/* ── Compact: listening ──────────────────────────────────── */}
        <View
          on={s.view === "compact"}
          className="flex items-center gap-1.5 pr-2 pl-2"
        >
          <HeroOrb state={s.orb} size={21} paused={s.view !== "compact"} />
          <Label tone={s.tone}>{s.label}</Label>
          <span className="flex-1" />
          <ChromeIcon as={ArrowsOutSimpleIcon} />
          <ChromeIcon as={MicrophoneIcon} />
          <ChromeIcon as={XIcon} dim />
        </View>

        {/* ── Expanded: the actual work ───────────────────────────── */}
        <View
          on={s.view === "exp"}
          className="flex flex-col gap-1.5 px-2 pt-2 pb-2"
        >
          <div className="flex items-center gap-1.5">
            <HeroOrb state={s.orb} size={16} paused={s.view !== "exp"} />
            <Label tone={s.tone} small>
              {s.label}
            </Label>
            <span className="flex-1" />
            <span className="mr-0.5 flex items-center gap-0.5">
              <svg viewBox="0 0 36 36" className="size-[13px]" aria-hidden>
                <circle
                  cx="18"
                  cy="18"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,.18)"
                  strokeWidth="5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,.72)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={(RING_CIRCUMFERENCE * (1 - s.ring)).toFixed(
                    1,
                  )}
                  transform="rotate(-90 18 18)"
                  className="transition-[stroke-dashoffset] duration-500 ease-out"
                />
              </svg>
              <b className="font-mono text-[9.5px] font-normal text-white/60">
                {Math.round(s.ring * 100)}%
              </b>
            </span>
            <ChromeIcon as={ArrowsInSimpleIcon} />
            <ChromeIcon as={MicrophoneIcon} />
            <ChromeIcon as={PushPinIcon} />
            <ChromeIcon as={GearSixIcon} dim />
            <ChromeIcon as={XIcon} dim />
          </div>

          {/* Transcript on the left, the task chain on the right. The
              divider and the task column only exist once there is a chain. */}
          <div
            style={{ minHeight: EXP_BODY_H + chainOverflow(flow.tasks.length) }}
            className="flex flex-1 items-stretch"
          >
            <p
              className={cn(
                "flex-1 pr-2 leading-[1.34] tracking-[-0.005em]",
                s.variant === "thinking" && "text-xs text-white/55",
                s.variant === "speaking" &&
                  "text-[12.5px] font-light text-white/90",
                s.variant === "said" &&
                  "text-[12.5px] font-medium text-white/88",
              )}
            >
              {s.transcript}
              {s.typing && (
                <span className="animate-caret ml-px inline-block h-[11px] w-[1.4px] -translate-y-px bg-white align-[-1px]" />
              )}
            </p>

            <div
              className={cn(
                "w-px shrink-0 bg-white/25 transition-opacity duration-300",
                hasTasks ? "my-0.75 opacity-100" : "opacity-0",
              )}
            />

            {/* The chain must fit the shell without the last step being
                clipped: four rows at the inherited 1.5 line-height need 78px
                in a 64px column, so the rows carry their own tight leading. */}
            <div
              className={cn(
                "flex shrink-0 flex-col gap-1 overflow-hidden transition-[width,padding-left] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)]",
                hasTasks ? "w-[150px] pl-2" : "w-0 pl-0",
              )}
            >
              {flow.tasks.map((task, i) => (
                <div
                  key={task}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap text-[10.5px] leading-[1.2] transition-all duration-300",
                    i < s.shown
                      ? "translate-y-0 opacity-100"
                      : "translate-y-[3px] opacity-0",
                    i < s.done ? "text-white/75" : "text-white/38",
                  )}
                >
                  <i
                    className={cn(
                      "size-2 shrink-0 rounded-full transition-all duration-300",
                      i < s.done
                        ? "bg-brand-green"
                        : "shadow-[0_0_0_1px_rgba(255,255,255,.28)_inset]",
                    )}
                  />
                  <span>{task}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The gate. Red because it is the palette's "irreversible" signal. */}
          {flow.gate && (
            <div
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border border-brand-red-edge bg-brand-red-tint p-2 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
                s.gate
                  ? "translate-y-0 opacity-100"
                  : "translate-y-[5px] opacity-0",
              )}
            >
              <p className="text-[10.5px] leading-[1.35] font-medium text-white/90">
                {flow.gate}
              </p>
              <div className="flex gap-1.5">
                <span className="grid h-5 place-items-center rounded-md bg-brand-red px-2.5 text-[10.5px] font-semibold text-brand-red-on">
                  Confirm
                </span>
                <span className="grid h-5 place-items-center rounded-md bg-white/14 px-2.5 text-[10.5px] font-semibold text-white/85">
                  Cancel
                </span>
              </div>
            </div>
          )}
        </View>

        {/* ── Idle: nothing running ───────────────────────────────── */}
        <View
          on={s.view === "idle"}
          className="flex flex-col gap-0.75 px-2 pt-1 pb-2"
        >
          <div className="flex items-center justify-end gap-0.5">
            <ChromeIcon as={MicrophoneIcon} />
            <ChromeIcon as={PushPinIcon} />
            <ChromeIcon as={GearSixIcon} dim />
            <ChromeIcon as={PowerIcon} danger />
          </div>
          <div className="grid flex-1 place-items-center text-[11px] font-medium text-white/30">
            No active tasks
          </div>
        </View>
      </div>

      <span
        className={cn(
          "mask-fillet-tr -ml-px shrink-0 bg-black transition-[width,height] duration-[550ms] ease-[cubic-bezier(.22,1,.36,1)]",
          VIEW_FILLET[s.view],
        )}
      />
    </div>
  );
}

/** One view of the notch. All four are stacked; only one is lit. */
function View({
  on,
  className,
  children,
}: {
  on: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0",
        // Fading in waits for the shell to be most of the way to its new
        // size; fading out is quick, so views never overlap visibly.
        on
          ? "opacity-100 transition-opacity delay-[130ms] duration-300"
          : "opacity-0 transition-opacity duration-150",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Label({
  tone,
  small,
  children,
}: {
  tone: Tone;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap uppercase transition-colors duration-300",
        small
          ? "text-[10.5px] font-semibold tracking-[0.32px]"
          : "text-[11px] font-bold tracking-[0.24px]",
        small && tone === "idle" ? "text-white/55" : TONE[tone],
      )}
    >
      {children}
    </span>
  );
}
