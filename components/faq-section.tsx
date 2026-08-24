"use client";

import { useId, useState } from "react";
import { PlusToggle } from "@/components/disclosure-toggle";
import { SectionHead } from "@/components/section-head";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   FAQ — six questions, in two columns.

   Two columns rather than one list because the answers are short and a
   single stack of six would run longer than the section deserves. The
   columns are independent, so opening one never shunts the other about.

   No boxes and no rules between rows. Each item carries a hairline down
   its own left edge, and with the items flush those hairlines join into
   one continuous rule per column — the open passage simply lights its
   own length of it. So the page never gains a panel it has to lose
   again, the layout does not flinch when something opens, and the
   marked-up column reads the way a passage marked in a margin does.

   Deliberately quieter than the accordion further up. That one raises a
   card because each item is a claim being made; these are answers being
   looked up, and they should not arrive with furniture.

   One open per column, as the reference has it. Exclusivity across the
   whole section would mean opening something on the right shuts
   something on the left — two changes in distant places at once, which
   reads as the page rearranging itself. Held to a column, each side is
   self-contained, and clicking the open one shuts it.
   ──────────────────────────────────────────────────────────────────── */

const FAQ: [question: string, answer: string][] = [
  [
    "Why is it not on the Mac App Store?",
    "Sandboxing would remove the product. An App Store app cannot drive other applications through the Accessibility API, reach folders outside its container, or run a background agent the way Rovyk does. We ship a direct download instead, so the capability survives.",
  ],
  [
    "What data leaves my Mac?",
    "By default, nothing. Speech to text, the model and the voice all run locally. If you add a cloud API key, the text of that specific request goes to the provider you chose, on your account. There is no Rovyk server in either path.",
  ],
  [
    "Why does it need Accessibility access?",
    "That permission is what lets it click buttons and type into apps that have no integration. It is the difference between an assistant that describes what to do and one that does it. You can revoke it in System Settings and everything else keeps working.",
  ],
  [
    "Can it delete my files?",
    "Only after you say yes. Deleting and moving both sit behind a confirmation gate written in code, independently of the model. It also only ever sees the folders you explicitly granted.",
  ],
  [
    "What happens if I never add an API key?",
    "It runs fully offline on a local model. System control, files, mail and calendar all work. Web browsing and web search are unavailable, and long multi-step reasoning is noticeably weaker than with a cloud model.",
  ],
  [
    "Does it work on Intel Macs?",
    "No. Rovyk is Apple Silicon only, M1 or later, on macOS 27 or later. The local models and the bundled browser agent both depend on it.",
  ],
];

/* Split down the middle rather than dealt alternately. The reference deals
   them left/right, which puts the DOM in the order 1,3,5,2,4,6 — so a
   screen reader and the tab key walk the page in an order nobody reading
   it would recognise. Halved, the two match. */
const HALF = Math.ceil(FAQ.length / 2);
const COLUMNS = [FAQ.slice(0, HALF), FAQ.slice(HALF)];

const EASE = "ease-[cubic-bezier(.52,.52,0,1)]";

function Item({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  const uid = useId();
  const head = `${uid}-q`;
  const panel = `${uid}-a`;

  return (
    <div className="relative">
      {/* The margin rule. Flush items make these one line down the column,
          so what changes on open is which length of it is lit — not the
          arrival of a border. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-px transition-colors duration-350",
          open ? "bg-white/55" : "bg-white/12",
        )}
      />

      <h3>
        <button
          type="button"
          id={head}
          aria-expanded={open}
          aria-controls={panel}
          onClick={onToggle}
          className={cn(
            "group/q flex w-full cursor-pointer items-center gap-5 py-4.5 pr-1 pl-6 text-left",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          )}
        >
          <span
            className={cn(
              "flex-1 text-[17px] leading-[1.32] tracking-[-0.02em] transition-colors duration-350",
              open ? "text-white" : "text-white/62 group-hover/q:text-white/88",
            )}
          >
            {q}
          </span>
          <PlusToggle open={open} className="size-7.5" />
        </button>
      </h3>

      {/* 0fr → 1fr, so it opens to the height the answer needs rather than
          a guessed pixel value. */}
      <div
        id={panel}
        role="region"
        aria-labelledby={head}
        className={cn(
          "grid transition-[grid-template-rows] duration-500 motion-reduce:transition-none",
          EASE,
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="max-w-[52ch] pr-6 pb-5.5 pl-6 text-[13.8px] leading-[1.62] font-light text-white/58">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  /* Which item is open in each column, or -1 for none. */
  const [open, setOpen] = useState<[number, number]>([0, 0]);

  const toggle = (column: number, item: number) =>
    setOpen((prev) => {
      const next: [number, number] = [...prev];
      next[column] = prev[column] === item ? -1 : item;
      return next;
    });

  return (
    <section id="faq" className="relative py-[clamp(96px,12.5vh,158px)]">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <SectionHead
          eyebrow="faq"
          title="Everything you need to know"
          className="mb-14"
        />

        <div className="grid gap-x-4 md:grid-cols-2">
          {COLUMNS.map((column, c) => (
            <div key={c} className="flex flex-col">
              {column.map(([q, a], i) => (
                <Item
                  key={q}
                  q={q}
                  a={a}
                  open={open[c] === i}
                  onToggle={() => toggle(c, i)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
