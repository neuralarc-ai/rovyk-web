"use client";

import { useId, useState } from "react";
import { Corners, PlusToggle } from "@/components/disclosure-toggle";
import { SectionHead } from "@/components/section-head";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   What sets it apart — three claims, disclosed one at a time.

   The move worth keeping from the reference is the glyph: closed, the
   row is a number, a rule and a line of type; opening it grows a 124px
   plate in between, pushing the text right. The panel does not so much
   expand as get made room for.

   One open at a time, and all-closed is allowed — these are three
   independent claims, not steps, so nothing is lost by shutting the
   lot.
   ──────────────────────────────────────────────────────────────────── */

type Apart = {
  n: string;
  label: string;
  heading: string;
  body: string;
  /**
   * The plate's 4×4 matrix — decorative, but the lit cells take the hue
   * this claim is actually about, rather than one colour for all three.
   * The palette gives every hue exactly one meaning and this section is
   * not the place to start borrowing them.
   */
  dots: number[];
  ink: string;
};

const ITEMS: Apart[] = [
  {
    n: "001",
    label: "Any app",
    heading: "It works with apps nobody integrated",
    body: "Other assistants only reach software they have partnered with. Rovyk drives the macOS Accessibility API, so it operates any window the way you do: click that button, type in that field. If you can do it with a mouse, you can ask for it.",
    dots: [0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1],
    // Indigo: the agent itself, operating.
    ink: "bg-brand-indigo",
  },
  {
    n: "002",
    label: "Long jobs",
    heading: "It keeps working while you do",
    body: "Start something that takes minutes and carry on. Task chips fill in, progress is spoken, and checkpoints let you correct it mid-run instead of finding out afterwards.",
    dots: [1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1],
    // Green: work landing, the same colour the HUD fills its task chips with.
    ink: "bg-brand-green",
  },
  {
    n: "003",
    label: "Memory",
    heading: "It remembers across sessions",
    body: "Which folder your invoices live in, how you like replies worded, what the project is called. Ask what it can do and it answers from live connection state, not a canned script.",
    dots: [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    // Pink: memory and voice.
    ink: "bg-brand-pink",
  },
];

const EASE = "ease-[cubic-bezier(.52,.52,0,1)]";

/**
 * The plate. Grows out of nothing as its claim opens.
 *
 * It used to be `hidden lg:grid`, which meant the one move this section is
 * built around — the row making room for a plate rather than the panel
 * expanding — happened only on a desktop. Below `md` the row wraps, so the
 * plate has a line of its own to grow into and costs the copy nothing; above
 * it, it sits inline and the size follows the width available.
 */
function Glyph({ item, open }: { item: Apart; open: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-input bg-background",
        "transition-[width,height,opacity,margin] duration-550",
        EASE,
        "motion-reduce:transition-none",
        open
          ? "mr-4 size-20 opacity-100 md:mr-5 md:size-25 lg:mr-7.5 lg:size-31"
          : "mr-0 size-0 opacity-0",
      )}
    >
      {/* Crosshair and corner ticks: the plate reads as a instrument face
          rather than a swatch. */}
      <span className="absolute inset-x-0 top-1/2 h-px bg-white/7" />
      <span className="absolute inset-y-0 left-1/2 w-px bg-white/7" />
      <Corners inset="9px" size="size-1" />

      {/* 63% of the plate, so the face follows it rather than being
          three more numbers to keep in step. */}
      <span className="grid size-[63%] place-items-center rounded-xl border border-border bg-accent">
        <span className="grid grid-cols-4 gap-0.75">
          {item.dots.map((lit, i) => (
            <i
              key={i}
              style={{ transitionDelay: open ? `${180 + i * 22}ms` : "0ms" }}
              className={cn(
                "size-1.25 rounded-[1px] transition-colors duration-300 motion-reduce:transition-none",
                lit && open ? item.ink : "bg-white/16",
              )}
            />
          ))}
        </span>
      </span>
    </span>
  );
}

export function ApartSection() {
  const [open, setOpen] = useState(0);
  const uid = useId();

  return (
    <section id="uses" className="relative py-(--section-y)">
      <div className="mx-auto w-full max-w-7xl px-4">
        <SectionHead
          eyebrow="what sets it apart"
          title="Built for how you actually use a Mac"
          className="mb-10 sm:mb-16"
        >
          Three things no other assistant on this machine will do for you.
        </SectionHead>

        <div className="rounded-3xl border border-input bg-card p-2">
          {ITEMS.map((item, i) => {
            const on = i === open;
            const head = `${uid}-h-${i}`;
            const panel = `${uid}-p-${i}`;
            return (
              <div key={item.n} className="relative">
                <div
                  className={cn(
                    // Wraps below `md`: the number, the rule, the plate and
                    // the toggle take more than half of the 246px a row has
                    // on a phone, which left the heading and its copy 115px —
                    // nine characters a line. Wrapped, the gutter and the
                    // toggle share the first line and the copy gets the whole
                    // of the second. `md` rather than `sm` because that is
                    // where the row is wide enough to carry the plate inline
                    // without taking the width back off the copy.
                    "relative flex flex-wrap items-center gap-y-3 transition-[padding] duration-500 md:flex-nowrap md:gap-y-0",
                    EASE,
                    "motion-reduce:transition-none",
                    on ? "px-5 pt-5.5 pb-6" : "px-4 py-4.5",
                    // A hairline between rows, gone either side of the open one
                    // so it never runs into the raised card's edge.
                    !on &&
                      i > 0 &&
                      open !== i - 1 &&
                      "shadow-[0_-1px_0_var(--border)]",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-2xl border border-input bg-accent shadow-[0_26px_60px_-26px_#000] transition-opacity duration-450",
                      on ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <Corners inset="10px" size="size-1.75" />
                  </span>

                  <span
                    className={cn(
                      "relative z-10 grid h-6.5 shrink-0 place-items-center rounded-sm border px-2.5 font-mono text-[11.5px] transition-colors duration-450",
                      on
                        ? "border-white bg-white text-[#0A0A0A]"
                        : "border-border bg-secondary text-white/45",
                    )}
                  >
                    {item.n}
                  </span>

                  {/* The rule belongs to the open state. Shut, it was a 14px
                      stub hanging off the number with nothing on the other
                      end of it — and worse once the row wraps, where it
                      pointed across an empty line at the toggle. Now it
                      grows out of the number as the plate makes room, which
                      is the same gesture the rest of the row is making. */}
                  <span
                    aria-hidden
                    className={cn(
                      "relative z-10 h-px shrink-0 bg-input transition-[width] duration-550",
                      EASE,
                      "motion-reduce:transition-none",
                      on ? "w-[clamp(22px,5vw,74px)]" : "w-0",
                    )}
                  />

                  <span className="relative z-10 flex items-center">
                    <Glyph item={item} open={on} />
                  </span>

                  <div
                    className={cn(
                      "relative z-10 order-2 min-w-0 grow basis-full transition-[padding] duration-500 md:order-none md:basis-0",
                      EASE,
                      // The indent pushes the copy clear of the rule beside
                      // it. Wrapped there is no rule beside it, and the
                      // indent only knocked every shut row 16px out of line
                      // with the number above it.
                      on ? "pl-0" : "pl-0 md:pl-4",
                    )}
                  >
                    <span
                      className={cn(
                        "block font-mono text-[10px] tracking-[0.18em] uppercase transition-colors duration-450",
                        on ? "text-white/45" : "text-white/28",
                      )}
                    >
                      {item.label}
                    </span>

                    <h3
                      id={head}
                      className={cn(
                        "mt-1.5 text-[clamp(20px,1.95vw,26px)] leading-[1.16] tracking-tight transition-colors duration-450",
                        on ? "text-white" : "text-white/68",
                      )}
                    >
                      {item.heading}
                    </h3>

                    {/* 0fr → 1fr, so it animates to the height the copy
                        actually needs instead of a guessed pixel value. */}
                    <div
                      id={panel}
                      role="region"
                      aria-labelledby={head}
                      className={cn(
                        "grid transition-[grid-template-rows] duration-550",
                        EASE,
                        "motion-reduce:transition-none",
                        on ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="max-w-[56ch] pt-3 text-sm leading-[1.6] font-light text-white/45">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </div>

                  <PlusToggle
                    open={on}
                    className="relative z-10 order-1 ml-auto size-10 md:order-none md:ml-6"
                  />
                </div>

                {/* The whole row is the target, which is what the reference
                    does — but a real button, laid over it, so it is one tab
                    stop that announces its state instead of a div listening
                    for clicks. A `<p>` cannot live inside a `<button>`, so
                    the trigger cannot be the row itself. */}
                <button
                  type="button"
                  aria-labelledby={head}
                  aria-expanded={on}
                  aria-controls={panel}
                  onClick={() => setOpen(on ? -1 : i)}
                  className="absolute inset-0 z-20 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
