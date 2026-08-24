"use client";

import { useEffect, useRef, useState } from "react";
import type { OrbState } from "thinking-orbs/engine";
import { ArrowUpIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { HeroOrb } from "@/components/hero-orb";
import { FOCUS_SCRIPT } from "@/lib/focus-script";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The focus window, running.

   One script, two surfaces. What differs is only how the request gets
   in and what comes back out:

   · Voice — the orb is the centre. Speech lands as transcript, and the
     agent answers out loud, so the reply is shown.
   · Chat  — no orb. The message is typed into the field, sent, and sits
     in the middle as the thing being worked on. Nothing is said back;
     the rails are the answer.

   Either way the task rails are identical, which is the argument the
   section is making: the surface changes, the work does not. Tasks are
   queued into the right rail when the turn starts thinking, then moved
   one by one into the left as they land — the same list at two moments,
   not two lists.
   ──────────────────────────────────────────────────────────────────── */

export type Mode = "voice" | "chat";

type Phase = "listening" | "thinking" | "working" | "speaking" | "rest";

/** The orb's geometry per phase — the mapping the orb section documents. */
const ORB_STATE: Record<Phase, OrbState> = {
  listening: "listening",
  thinking: "solving",
  working: "working",
  speaking: "composing",
  rest: "searching",
};

/* The same phase reads differently depending on how the request arrived:
   an open mic is listening, a keyboard is not. */
const PHASE_LABEL: Record<Mode, Record<Phase, string>> = {
  voice: {
    listening: "Listening",
    thinking: "Thinking",
    working: "Working",
    speaking: "Speaking",
    rest: "Idle",
  },
  chat: {
    listening: "Typing",
    thinking: "Thinking",
    working: "Working",
    speaking: "Working",
    rest: "Idle",
  },
};

/* Timings. Typing is per character, so a longer line simply takes longer
   rather than racing to hit a fixed duration. */
const SAY_MS_PER_CHAR = 34;
const REPLY_MS_PER_CHAR = 26;
const QUEUE_STAGGER_MS = 170;
const TASK_COMPLETE_MS = 460;
const THINK_MS = 800;
const REST_MS = 1300;
const SETTLE_MS = 320;
const SEND_FLASH_MS = 220;

type DemoState = {
  phase: Phase;
  /** What is in the input field. Chat types here before sending. */
  draft: string;
  /** What the centre is showing. */
  message: string;
  /** Whose line the centre is showing — voice styles the two differently. */
  speaker: "you" | "it";
  /** The send button's pressed flash, for the frame it is being clicked. */
  sending: boolean;
  pending: string[];
  done: string[];
};

const IDLE: DemoState = {
  phase: "rest",
  draft: "",
  message: "",
  speaker: "you",
  sending: false,
  pending: [],
  done: [],
};

const LAST = FOCUS_SCRIPT[FOCUS_SCRIPT.length - 1];
const ALL_TASKS = FOCUS_SCRIPT.flatMap((turn) => turn.tasks);

/** The finished article — first paint, and what reduced motion keeps. */
const resolved = (mode: Mode): DemoState => ({
  ...IDLE,
  message: mode === "voice" ? LAST.reply : LAST.said,
  speaker: mode === "voice" ? "it" : "you",
  done: ALL_TASKS,
});

/**
 * Mode, visibility and the running script, wired together.
 *
 * Restarts on a mode change on purpose: switching input is the one thing a
 * visitor can do here, and replaying from the top is what makes "same brain,
 * different surface" legible — you watch the same errand happen the other way.
 */
function useFocusRunner() {
  const [mode, setMode] = useState<Mode>("voice");
  const [visible, setVisible] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DemoState>(() => resolved("voice"));

  /* Nothing runs off screen — this is a loop with a rAF typewriter in it,
     and the page already carries two orbs. */
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    /* Reduced motion shows the errand done rather than performed. */
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      });

    /* Typed off elapsed time rather than one timer per character: a
       50-character line is one rAF loop instead of fifty timeouts, and it
       stays in step if a frame is dropped. */
    const typeInto = (
      text: string,
      msPerChar: number,
      field: "draft" | "message",
    ) =>
      new Promise<void>((resolve) => {
        const total = text.length * msPerChar;
        const start = performance.now();
        const step = (now: number) => {
          if (cancelled) return resolve();
          const f = Math.min(1, (now - start) / total);
          const shown = text.slice(0, Math.round(f * text.length));
          setState((s) => ({ ...s, [field]: shown }));
          if (f < 1) raf = requestAnimationFrame(step);
          else resolve();
        };
        raf = requestAnimationFrame(step);
      });

    (async () => {
      while (true) {
        /* Voice can clear the centre — the orb holds it. Chat cannot: the
           message is the only thing in there, so the last one stays up while
           the next is typed, exactly as a real thread would leave it. */
        setState(
          mode === "chat"
            ? { ...IDLE, message: LAST.said, speaker: "you" }
            : IDLE,
        );
        await wait(SETTLE_MS);
        if (cancelled) return;

        for (const turn of FOCUS_SCRIPT) {
          /* ── The request arrives ─────────────────────────────────── */
          if (mode === "voice") {
            // Spoken: it lands straight in the middle as it is transcribed.
            setState((s) => ({
              ...s,
              phase: "listening",
              speaker: "you",
              message: "",
            }));
            await typeInto(turn.said, SAY_MS_PER_CHAR, "message");
          } else {
            // Typed: it goes into the field first, then gets sent.
            setState((s) => ({ ...s, phase: "listening", draft: "" }));
            await typeInto(turn.said, SAY_MS_PER_CHAR, "draft");
            if (cancelled) return;
            await wait(SETTLE_MS);
            if (cancelled) return;

            setState((s) => ({ ...s, sending: true }));
            await wait(SEND_FLASH_MS);
            if (cancelled) return;
            setState((s) => ({
              ...s,
              sending: false,
              draft: "",
              speaker: "you",
              message: turn.said,
            }));
          }
          if (cancelled) return;
          await wait(SETTLE_MS);
          if (cancelled) return;

          /* ── Thinking, and the queue filling ─────────────────────── */
          setState((s) => ({ ...s, phase: "thinking" }));
          for (const task of turn.tasks) {
            await wait(QUEUE_STAGGER_MS);
            if (cancelled) return;
            setState((s) => ({ ...s, pending: [...s.pending, task] }));
          }
          await wait(THINK_MS);
          if (cancelled) return;

          /* ── Working: each task crosses from one rail to the other ─ */
          setState((s) => ({ ...s, phase: "working" }));
          for (const task of turn.tasks) {
            await wait(TASK_COMPLETE_MS);
            if (cancelled) return;
            setState((s) => ({
              ...s,
              pending: s.pending.filter((t) => t !== task),
              done: [...s.done, task],
            }));
          }

          /* ── The answer, spoken ──────────────────────────────────────
             Voice only. Typing gets the work done and says nothing back;
             the rails are the report. */
          if (mode === "voice") {
            setState((s) => ({
              ...s,
              phase: "speaking",
              speaker: "it",
              message: "",
            }));
            await typeInto(turn.reply, REPLY_MS_PER_CHAR, "message");
            if (cancelled) return;
          }

          setState((s) => ({ ...s, phase: "rest" }));
          await wait(REST_MS);
          if (cancelled) return;
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [mode, visible]);

  /* A mode switch replays from the top, so the centre should not be left
     holding the other surface's last line while the new run spins up. */
  const changeMode = (next: Mode) => {
    if (next === mode) return;
    setState(resolved(next));
    setMode(next);
  };

  return { mode, changeMode, state, hostRef };
}

/* ── Parts ──────────────────────────────────────────────────────────── */

function TaskItem({
  task,
  done,
  reverse,
}: {
  task: string;
  done?: boolean;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-right-3 flex items-center gap-2 text-[11px] leading-tight whitespace-nowrap duration-500 motion-reduce:animate-none",
        reverse && "flex-row-reverse",
        done ? "text-white/70" : "text-white/38",
      )}
    >
      <i
        className={cn(
          "size-2 shrink-0 rounded-full",
          done
            ? "bg-brand-green"
            : "shadow-[0_0_0_1px_rgba(255,255,255,.3)_inset]",
        )}
      />
      <span>{task}</span>
    </div>
  );
}

const BARS = [0.5, 0.85, 1, 0.7, 0.45];

/** An open microphone. Bars ripple rather than pulsing as one block. */
function Waveform() {
  return (
    <span aria-hidden className="flex h-3.5 items-center gap-[3px]">
      {BARS.map((height, i) => (
        <span
          key={i}
          style={{ height: `${height * 100}%`, animationDelay: `${i * 110}ms` }}
          className="animate-waveform w-0.5 origin-center rounded-full bg-brand-pink-text/80 motion-reduce:animate-none"
        />
      ))}
    </span>
  );
}

/* ── The window ─────────────────────────────────────────────────────── */

const MODES: { id: Mode; label: string }[] = [
  { id: "voice", label: "voice" },
  { id: "chat", label: "chat" },
];

export function FocusDemo({ className }: { className?: string }) {
  const { mode, changeMode, state, hostRef } = useFocusRunner();

  return (
    <div
      ref={hostRef}
      className={cn("@container/focus flex flex-col overflow-hidden", className)}
    >
      <div className="flex items-center justify-between border-b border-border bg-accent px-4 py-3">
        <span className="font-mono text-[10.5px] tracking-[0.12em] text-white/45">
          FOCUS MODE
        </span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-white/32 uppercase">
          {PHASE_LABEL[mode][state.phase]}
        </span>
      </div>

      {/* One continuous space: the centre sits in the middle of the whole
          window, with the rails floating clear of it rather than walling
          it into a column. */}
      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center px-20 @[440px]/focus:px-36">
          <div className="flex h-full flex-col items-center justify-center gap-4">
            {/* Voice only — the orb is what makes the two surfaces look
                different. Everything below it is deliberately identical. */}
            {mode === "voice" && (
              <HeroOrb
                state={ORB_STATE[state.phase]}
                size={148}
                className="shrink-0 opacity-90"
              />
            )}
            <p
              key={state.message}
              aria-hidden
              className={cn(
                "animate-in fade-in line-clamp-3 min-h-[3em] max-w-[34ch] text-center leading-[1.45] duration-300 motion-reduce:animate-none",
                state.speaker === "you"
                  ? "font-mono text-[12px] text-white/45"
                  : "font-sans text-[13.5px] text-white/88",
              )}
            >
              {state.message}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-24 flex-col justify-start gap-2 pt-5 pl-4 @[440px]/focus:w-34 @[440px]/focus:pl-5">
          {state.done.map((task) => (
            <TaskItem key={task} task={task} done />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-24 flex-col items-end justify-start gap-2 pt-5 pr-4 @[440px]/focus:w-34 @[440px]/focus:pr-5">
          {state.pending.map((task) => (
            <TaskItem key={task} task={task} reverse />
          ))}
        </div>
      </div>

      {/* The input. Voice shows a live mic it can be stopped from; chat
          shows the message being typed and sent. */}
      <div className="flex items-center gap-2.5 border-t border-border bg-background px-3 py-2.5">
        <div
          role="group"
          aria-label="Input mode"
          className="flex shrink-0 items-center overflow-hidden rounded-lg border border-input font-mono text-[10px] tracking-wide uppercase"
        >
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={mode === option.id}
              onClick={() => changeMode(option.id)}
              className={cn(
                "px-2 py-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                mode === option.id
                  ? "bg-white/90 text-black"
                  : "text-white/40 hover:text-white/70",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "voice" ? (
          <>
            <span className="flex-1 truncate text-[12.5px] text-white/28">
              Listening: say what you need
            </span>
            {/* Stopping the mic is exactly what switching to chat means, so
                the control does the real thing rather than miming it. */}
            <button
              type="button"
              onClick={() => changeMode("chat")}
              className="flex shrink-0 items-center gap-2 rounded-full border border-input bg-secondary py-1 pr-1 pl-2.5 transition-colors duration-200 hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Waveform />
              <span className="grid size-4.5 place-items-center rounded-full bg-white/10 text-white/60">
                <XIcon weight="bold" className="size-2.5" aria-hidden />
              </span>
              <span className="sr-only">Stop listening and type instead</span>
            </button>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className="flex-1 truncate text-[12.5px] text-white/70"
            >
              {state.draft || (
                <span className="text-white/28">Type a message</span>
              )}
              {state.draft && (
                <span className="animate-caret ml-px inline-block h-[1em] w-px -translate-y-px bg-white/60 align-[-0.15em]" />
              )}
            </span>
            {/* Pressed by the script, not by the visitor — it is part of the
                recording, so it is not a control. */}
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full transition-all duration-150",
                state.sending
                  ? "scale-90 bg-white text-black"
                  : state.draft
                    ? "bg-white/85 text-black"
                    : "bg-white/10 text-white/35",
              )}
            >
              <ArrowUpIcon weight="bold" className="size-3.5" />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
