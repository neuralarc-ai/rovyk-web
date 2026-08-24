"use client";

import { useState } from "react";
import {
  CheckIcon,
  EnvelopeSimpleIcon,
  FolderIcon,
  MicrophoneIcon,
  PersonArmsSpreadIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/** The graph-paper ground each demo floats on. */
export function Skel() {
  return (
    <div
      aria-hidden
      className="bg-hairline-grid mask-grid-center pointer-events-none absolute inset-0 [--grid-size:132px]"
    />
  );
}

export function Viz({
  caption,
  children,
  className,
}: {
  caption: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card",
        className,
      )}
    >
      <p className="border-b border-border px-5 py-[15px] text-center text-[12.5px] text-white/52 italic">
        {caption}
      </p>
      <div className="relative grid flex-1 place-items-center px-[26px] py-[26px]">
        <Skel />
        <div className="relative z-10 w-full max-w-[330px] rounded-2xl border border-input bg-secondary p-[17px] shadow-[0_24px_54px_-24px_#000]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Head({
  dot,
  children,
}: {
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5 text-[12px] text-white/52">
      <i aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      {children}
    </div>
  );
}

/* ── 01 · The gate ─────────────────────────────────────────────────── */

const GATE_IDLE = "Nothing has moved yet.";

export function GateDemo({ className }: { className?: string }) {
  const [note, setNote] = useState<{ text: string; done: boolean } | null>(
    null,
  );
  return (
    <Viz caption="Try it. Cancel actually cancels." className={className}>
      <Head dot="bg-brand-red">Confirmation required</Head>
      <p className="mb-[11px] text-[14.5px] leading-[1.35] tracking-[-0.012em]">
        Move 47 files from Downloads to Archive?
      </p>
      <p className="mb-3.5 font-mono text-[10.5px] leading-[1.7] text-white/40">
        invoice-q3-final.pdf
        <br />
        screenshot-2026-08-04.png
        <br />+ 45 more
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            setNote({ text: "Cancelled. Nothing moved.", done: false })
          }
          className="h-8 flex-1 cursor-pointer rounded-lg border border-input text-[12.5px] font-medium transition-transform duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            setNote({ text: "47 files moved. Undo for 30 days.", done: true })
          }
          className="h-8 flex-1 cursor-pointer rounded-lg border border-brand-red bg-brand-red text-[12.5px] font-medium text-brand-red-on transition-transform duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Confirm
        </button>
      </div>
      <p
        aria-live="polite"
        className={cn(
          "mt-[11px] min-h-[13px] font-mono text-[10.5px] transition-colors duration-300",
          note?.done ? "text-white" : "text-white/45",
        )}
      >
        {note?.text ?? GATE_IDLE}
      </p>
    </Viz>
  );
}

/* ── 02 · The honesty check ────────────────────────────────────────── */

const CLAIMS = [
  { text: "Claimed it read your mail", verdict: "it did", ok: true },
  { text: "Claimed it drafted a reply", verdict: "it did", ok: true },
  { text: "Claimed it sent the reply", verdict: "it did not", ok: false },
];

export function HonestyDemo({ className }: { className?: string }) {
  return (
    <Viz
      caption="Every reply is checked against what actually ran."
      className={className}
    >
      <Head dot="bg-brand-green">Honesty check</Head>
      {CLAIMS.map((claim, i) => (
        <div
          key={claim.text}
          className={cn(
            "flex items-start gap-2.5 py-2.5 text-[12.4px] leading-[1.45] text-white/68",
            i > 0 && "border-t border-border",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "mt-0.5 grid size-[15px] shrink-0 place-items-center rounded-full border",
              claim.ok
                ? "border-brand-green-edge bg-brand-green-tint"
                : "border-brand-red-edge bg-brand-red-tint",
            )}
          >
            {claim.ok ? (
              <CheckIcon
                weight="bold"
                className="size-[9px] text-brand-green"
              />
            ) : (
              <XIcon weight="bold" className="size-[9px] text-brand-red" />
            )}
          </span>
          <span>
            {claim.text} &middot;{" "}
            <b
              className={cn(
                "font-medium",
                claim.ok ? "text-white/80" : "text-brand-red-text",
              )}
            >
              {claim.verdict}
            </b>
          </span>
        </div>
      ))}
      <p className="mt-3 font-mono text-[10.5px] text-white/45">
        Caught before it reached you. Reply corrected.
      </p>
    </Viz>
  );
}

/* ── 03 · Permissions ──────────────────────────────────────────────── */

const PERMS = [
  { icon: MicrophoneIcon, name: "Microphone", without: "no wake word" },
  { icon: FolderIcon, name: "Documents folder", without: "no file search" },
  {
    icon: EnvelopeSimpleIcon,
    name: "Mail & Calendar",
    without: "no inbox or scheduling",
  },
  {
    icon: PersonArmsSpreadIcon,
    name: "Accessibility",
    without: "no app control",
  },
];

export function PermsDemo({ className }: { className?: string }) {
  // Accessibility off out of the gate, so the point is made before you touch it.
  const [on, setOn] = useState([true, true, true, false]);
  const off = PERMS.filter((_, i) => !on[i]);
  const note =
    off.length === 0
      ? "Everything granted. Nothing held back."
      : off.length > 2
        ? `${off.length} permissions off · working with what is left`
        : `${off.map((p) => p.without).join(" · ")}`;

  return (
    <Viz
      caption="Turn any of it off and it keeps working without that piece."
      className={className}
    >
      <Head dot="bg-brand-indigo">Permissions</Head>
      {PERMS.map((perm, i) => {
        const Icon = perm.icon;
        return (
          <button
            key={perm.name}
            type="button"
            role="switch"
            aria-checked={on[i]}
            onClick={() =>
              setOn((prev) => prev.map((v, k) => (k === i ? !v : v)))
            }
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 py-2.5 text-left text-[12.5px] transition-colors duration-200",
              i > 0 && "border-t border-border",
              on[i] ? "text-white/68" : "text-white/34",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <Icon
              weight="regular"
              className="size-[15px] shrink-0"
              aria-hidden
            />
            {perm.name}
            <span
              aria-hidden
              className={cn(
                "relative ml-auto h-[19px] w-8 shrink-0 rounded-full transition-colors duration-300",
                on[i]
                  ? "bg-brand-green"
                  : "bg-white/10 shadow-[0_0_0_1px_var(--input)_inset]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-[15px] rounded-full transition-[left,background] duration-300 ease-[cubic-bezier(.52,.52,0,1)]",
                  on[i] ? "left-[15px] bg-[#0B0B0B]" : "left-0.5 bg-white/45",
                )}
              />
            </span>
          </button>
        );
      })}
      <p
        aria-live="polite"
        className="mt-3 min-h-[13px] font-mono text-[10.5px] text-white/45"
      >
        {note}
      </p>
    </Viz>
  );
}
