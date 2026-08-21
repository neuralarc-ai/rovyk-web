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
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ────────────────────────────────────────────────────────────────────
   The notch HUD: one full run of work, on a loop.

   The point of the whole hero is "agency, not chat" — so this is not a
   chat bubble. It is the notch growing from an idle sliver into a task
   runner, doing a chain of real steps, stopping at a confirmation gate
   before the irreversible one, and shrinking back. Four sizes, one
   continuous shape.
   ──────────────────────────────────────────────────────────────────── */

type HudView = "notch" | "compact" | "exp" | "idle";
type Tone = "idle" | "on" | "work" | "say";

const SAY = "Hey Rovyk, summarise my unread mail and reply to Jordan";
const TASKS = ["Open Mail", "Read 12 unread", "Draft reply", "Create event"];
const SPOKEN =
  "Three needed a reply. I sent Jordan your Thursday confirmation and put it on the calendar.";

/** The notch's four sizes. Width, height and radius all animate together. */
const VIEW_SHELL: Record<HudView, string> = {
  notch: "w-[156px] h-[26px] rounded-b-[13px]",
  compact: "w-[192px] h-[46px] rounded-b-[17px]",
  exp: "w-[368px] h-[118px] rounded-b-[21px]",
  idle: "w-[272px] h-[74px] rounded-b-[19px]",
};

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
        "grid size-[22px] shrink-0 place-items-center",
        danger ? "text-brand-red" : dim ? "text-white/34" : "text-white/42",
      )}
    >
      <Icon weight="regular" className="size-[12.5px]" aria-hidden />
    </span>
  );
}

export function RovykHud({ className }: { className?: string }) {
  const [s, setS] = useState<HudState>(START);
  const root = useRef<HTMLDivElement>(null);
  const patch = (next: Partial<HudState>) => setS((prev) => ({ ...prev, ...next }));

  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // A single legible frame: mid-run, gate open, so the still image
        // still says "it does work and it asks first".
        setS({
          view: "exp",
          orb: "working",
          label: "Thinking",
          tone: "work",
          transcript: "Reading your inbox…",
          variant: "thinking",
          typing: false,
          shown: 3,
          done: 2,
          ring: 0.6,
          gate: true,
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
            onUpdate: () => patch({ transcript: text.slice(0, Math.round(cursor.n)) }),
          },
          at,
        );
        at += text.length * rate + hold;
      };

      /* Asleep in the menu bar. */
      step(() => setS(START), 2.4);

      /* Wakes on the wake word. */
      step(() => patch({ view: "compact", orb: "listening", label: "Listening", tone: "on" }), 1.7);

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
      type(SAY, 0.034, 0.65);
      step(() => patch({ typing: false }), 0);

      /* Plans, then runs the chain — each task lands, then completes. */
      step(
        () =>
          patch({
            orb: "solving",
            label: "Thinking",
            tone: "work",
            transcript: "Reading your inbox…",
            variant: "thinking",
          }),
        0.35,
      );
      for (let i = 1; i <= TASKS.length; i++) {
        step(() => {
          patch({ shown: i, done: i - 1, ring: 0.18 + 0.14 * i });
          if (i === 2) patch({ orb: "working" });
        }, 0.52);
        step(() => patch({ done: i < TASKS.length ? i : TASKS.length - 1 }), 0.22);
      }

      /* The gate. Nothing irreversible happens without this, and it is
         deterministic — not the model's call. */
      step(() => patch({ gate: true }), 2.6);
      step(() => patch({ shown: TASKS.length, done: TASKS.length, gate: false }), 0.5);

      /* Reports back, out loud. */
      step(
        () =>
          patch({
            orb: "composing",
            label: "Speaking",
            tone: "say",
            transcript: SPOKEN,
            variant: "speaking",
            ring: 0.62,
          }),
        3.6,
      );

      /* Folds away. */
      step(() => patch({ view: "compact", label: "Idle", tone: "idle", orb: "searching" }), 0.9);
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
    { scope: root },
  );

  const hasTasks = s.shown > 0;

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
        // a real piece of macOS chrome. Expanded it is 404px wide, which is
        // wider than the whole window at phone sizes — so scale the notch to
        // the machine it hangs in, anchored to the edge it hangs from.
        "origin-top scale-[0.52] sm:scale-[0.8] lg:scale-100",
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
        className={cn(
          "relative overflow-hidden bg-black transition-[width,height,border-radius] duration-[580ms] ease-[cubic-bezier(.22,1,.36,1)]",
          VIEW_SHELL[s.view],
          s.view === "exp" && s.gate && "h-[186px]",
        )}
      >
        {/* ── Sliver: just a pulse and a word ─────────────────────── */}
        <View on={s.view === "notch"} className="flex items-center justify-between px-[7px]">
          <HeroOrb state={s.orb} size={14} />
          <span className={cn("text-[8px] font-medium", TONE[s.tone])}>{s.label}</span>
        </View>

        {/* ── Compact: listening ──────────────────────────────────── */}
        <View on={s.view === "compact"} className="flex items-center gap-1.5 pr-2 pl-[9px]">
          <HeroOrb state={s.orb} size={21} />
          <Label tone={s.tone}>{s.label}</Label>
          <span className="flex-1" />
          <ChromeIcon as={ArrowsOutSimpleIcon} />
          <ChromeIcon as={MicrophoneIcon} />
          <ChromeIcon as={XIcon} dim />
        </View>

        {/* ── Expanded: the actual work ───────────────────────────── */}
        <View on={s.view === "exp"} className="flex flex-col gap-1.5 px-[9px] pt-[7px] pb-[9px]">
          <div className="flex items-center gap-1.5">
            <HeroOrb state={s.orb} size={16} />
            <Label tone={s.tone} small>
              {s.label}
            </Label>
            <span className="flex-1" />
            <span className="mr-0.5 flex items-center gap-0.5">
              <svg viewBox="0 0 36 36" className="size-[13px]" aria-hidden>
                <circle cx="18" cy="18" r={RING_R} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="5" />
                <circle
                  cx="18"
                  cy="18"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,.72)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={(RING_CIRCUMFERENCE * (1 - s.ring)).toFixed(1)}
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
          <div className="flex min-h-16 flex-1 items-stretch">
            <p
              className={cn(
                "flex-1 pr-[9px] leading-[1.34] tracking-[-0.005em]",
                s.variant === "thinking" && "text-[12px] text-white/55",
                s.variant === "speaking" && "text-[12.5px] font-light text-white/90",
                s.variant === "said" && "text-[12.5px] font-medium text-white/88",
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
                hasTasks ? "my-[3px] opacity-100" : "opacity-0",
              )}
            />

            {/* The chain must fit the shell without the last step being
                clipped: four rows at the inherited 1.5 line-height need 78px
                in a 64px column, so the rows carry their own tight leading. */}
            <div
              className={cn(
                "flex shrink-0 flex-col gap-1 overflow-hidden transition-[width,padding-left] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)]",
                hasTasks ? "w-[150px] pl-[9px]" : "w-0 pl-0",
              )}
            >
              {TASKS.map((task, i) => (
                <div
                  key={task}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap text-[10.5px] leading-[1.2] transition-all duration-300",
                    i < s.shown ? "translate-y-0 opacity-100" : "translate-y-[3px] opacity-0",
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
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-[10px] border border-brand-red-edge bg-brand-red-tint p-2 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
              s.gate ? "translate-y-0 opacity-100" : "translate-y-[5px] opacity-0",
            )}
          >
            <p className="text-[10.5px] leading-[1.35] font-medium text-white/90">
              Send the drafted reply to jordan@northlane.co?
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
        </View>

        {/* ── Idle: nothing running ───────────────────────────────── */}
        <View on={s.view === "idle"} className="flex flex-col gap-[3px] px-[7px] pt-[5px] pb-[7px]">
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
        on ? "opacity-100 transition-opacity delay-[130ms] duration-300" : "opacity-0 transition-opacity duration-150",
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
