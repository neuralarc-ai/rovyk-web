"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { getLenis } from "@/components/smooth-scroll";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ────────────────────────────────────────────────────────────────────
   The contents column beside a legal document.

   Numbered stops that mark where you are, which is the same job the orb
   section's rail does and is written the same way: one ScrollTrigger
   per section spanning a line across the viewport, so exactly one is
   ever live and nothing measures seventeen elements per frame.

   `self-start` is load-bearing. As a grid child this column stretches
   to the height of the document beside it by default, and an element
   already as tall as its container has nowhere to stick to — the rule
   applies and does nothing. Shrunk to its own content, it travels.
   ──────────────────────────────────────────────────────────────────── */

/** Where a section counts as the one you are in: a line a fifth of the way
 *  down the viewport, just under where the column itself parks. */
const ANCHOR = "20%";

export function LegalNav({
  items,
}: {
  items: { id: string; title: string }[];
}) {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      /* The sections are contiguous, so one section's end is the next one's
         start and the handoff needs no arbitration. */
      const triggers = items.map(({ id }, i) => {
        const el = document.getElementById(id);
        if (!el) return null;
        return ScrollTrigger.create({
          trigger: el,
          start: `top ${ANCHOR}`,
          end: `bottom ${ANCHOR}`,
          onToggle: ({ isActive }) => isActive && setActive(i),
        });
      });
      return () => triggers.forEach((t) => t?.kill());
    },
    { dependencies: [items] },
  );

  /* Lenis owns the scroll, so a native hash jump would be read back as
     user input on the next frame and fight the glide. Same bargain the
     orb rail makes. */
  const jump = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    const lenis = getLenis();
    if (!el || !lenis) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: -112, duration: 1 });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav
      ref={root}
      aria-label="Contents"
      className="hidden self-start lg:sticky lg:top-24 lg:block"
    >
      <span className="mb-5 block font-mono text-[10px] tracking-[0.18em] text-white/30 uppercase">
        Contents
      </span>

      {/* A hairline down the whole column, the way the FAQ marks a passage
          in its margin — so the lit entry reads as a place on a scale
          rather than a highlight that arrived from nowhere. */}
      <ol className="relative flex flex-col border-l border-border pl-4">
        {items.map(({ id, title }, i) => {
          const on = i === active;
          return (
            <li key={id} className="relative">
              {on ? (
                <span
                  aria-hidden
                  className="absolute top-1/2 -left-4 h-4 w-px -translate-y-1/2 bg-white"
                />
              ) : null}
              <a
                href={`#${id}`}
                onClick={(e) => jump(e, id)}
                aria-current={on ? "true" : undefined}
                className="group/toc flex items-baseline gap-3 py-[5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    "font-mono text-[9.5px] tabular-nums transition-colors duration-350",
                    on ? "text-white" : "text-white/28",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-[13px] leading-[1.4] transition-colors duration-350",
                    on
                      ? "text-white"
                      : "text-white/42 group-hover/toc:text-white/72",
                  )}
                >
                  {title}
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      {/* Stacked, the sticky column is worse than nothing — it would sit
          between the lede and the first clause as seventeen links nobody
          asked for. The document is readable top to bottom without it. */}
    </nav>
  );
}
