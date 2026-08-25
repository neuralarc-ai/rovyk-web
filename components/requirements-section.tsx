import { AppleLogo } from "@/components/apple-logo";
import { SectionHead } from "@/components/section-head";
import { MacWindow } from "@/components/ui/mac-window";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   Requirements — the spec label on the back of the thing.

   The reference is six key/value rows, and its own heading says why
   that is the wrong shape: "what it needs" and "what it will not do"
   are two different questions, and a flat table asks the reader to
   sort them out for themselves. So they are separated here — three
   machine specs, then the line where the product's own capability
   stops — inside one panel with hairline bands, the way a spec label
   is printed rather than the way a table is drawn.

   The offline/keyed split is the honest version of a claim this page
   must not overstate: everything local works, and the reasoning is
   measurably weaker without a key. Set side by side, that is legible
   at a glance instead of buried at the end of a sentence.

   It is set as prose below the plate rather than as two more bands
   inside it. The plate is a spec label — three fixed numbers about a
   machine, and a window frame is the right furniture for that. Where
   the product stops is an argument, and stacking it into the same
   chrome made a claim look like a fourth row of specifications. Two
   blocks, two registers, one heading each.
   ──────────────────────────────────────────────────────────────────── */

const BAND = "border-t border-border";
const LABEL = "font-mono text-[10px] tracking-[0.18em] text-white/34 uppercase";

/* The three marks are deliberately different heights — a die, a logo, a
   bar meter. Left to size themselves they would push each column's value,
   rule and note to a different baseline, so the row they sit in is given
   the height of the tallest mark and everything is centred inside it.
   One constant, so the row and the die cannot drift apart. */
const MARK_SIZE = "h-12";

/* ── The three little diagrams ─────────────────────────────────────── */

/**
 * The bloom Apple lights its own silicon with, in our four hues — one to a
 * corner, so the die sits in the middle of a colour wheel rather than on a
 * single wash. Written off the palette variables rather than as literals,
 * so it cannot drift from the rest of the page.
 *
 * A shadow, not a background: it blooms outside the die's box and so costs
 * the row no height, which is what keeps the three marks on one line.
 */
const CHIP_GLOW = (
  [
    ["--brand-indigo", "-3px -3px"],
    ["--brand-pink", "3px -3px"],
    ["--brand-red", "3px 3px"],
    ["--brand-green", "-3px 3px"],
  ] as const
)
  .map(
    ([hue, offset]) =>
      `${offset} 11px -1px color-mix(in srgb, var(${hue}) 55%, transparent)`,
  )
  .join(", ");

/** The die itself: black, the mark in the middle, lit from behind. */
function ChipMark() {
  return (
    <span
      aria-hidden
      style={{ boxShadow: CHIP_GLOW }}
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center gap-1",
        "rounded border border-white/12 bg-black p-1",
        "font-mono text-[13px] leading-none text-white",
        MARK_SIZE,
      )}
    >
      <AppleLogo size={12} className="text-white" />
      <span>M1</span>
    </span>
  );
}

/** Eight segments: four for the floor, all eight for the recommendation. */
function MemoryMark() {
  return (
    <span aria-hidden className="flex h-7 items-end gap-0.75">
      {Array.from({ length: 8 }, (_, i) => (
        <i
          key={i}
          className={cn(
            "block w-1.5 h-6 rounded-[1px]",
            i < 4 ? " bg-white/55" : " border border-white/25",
          )}
        />
      ))}
    </span>
  );
}

const SPECS = [
  {
    mark: <ChipMark />,
    k: "Chip",
    v: "Apple Silicon",
    sub: "M1 or later",
    note: "Intel Macs are not supported.",
  },
  {
    mark: <AppleLogo size={36} />,
    k: "System",
    v: "macOS 27",
    sub: "or later",
    note: "A menu bar utility, not a windowed app.",
  },
  {
    mark: <MemoryMark />,
    k: "Memory",
    v: "8 GB",
    sub: "16 GB recommended",
    note: "To run local models well.",
  },
];

/**
 * The two halves. `lit` is the difference between them and is carried by the
 * marker alone — filled green for what the machine can do by itself, an empty
 * ring for what waits on a key you bring. Green means available everywhere
 * else on this page, so it cannot mean anything else here.
 */
const STOPS = [
  {
    kicker: "Works fully offline",
    lit: true,
    items: ["System control", "Files", "Mail and calendar"],
    note: "Reasoning still runs on-device, and is measurably weaker on complex, multi-step work.",
  },
  {
    kicker: "Needs your own key",
    lit: false,
    items: ["Web browsing", "Web search", "The strongest reasoning"],
    note: "Your provider, your key, your bill. Nothing is billed through us, and none of it is on by default.",
  },
];

function Stop({
  stop,
  className,
}: {
  stop: (typeof STOPS)[number];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-6 flex items-center gap-2.5">
        <i
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            stop.lit ? "bg-brand-green" : "border border-white/45",
          )}
        />
        <span className={LABEL}>{stop.kicker}</span>
      </div>

      <ul className="flex flex-col gap-3">
        {stop.items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-3.5 text-[15.5px] leading-[1.4] font-light text-white/85"
          >
            <i
              aria-hidden
              className={cn(
                "size-1 shrink-0 rounded-full",
                stop.lit ? "bg-brand-green" : "border border-white/40",
              )}
            />
            {item}
          </li>
        ))}
      </ul>

      {/* mt-auto pins the note to the bottom, so the two hairlines line up
          across the columns however the lists above them differ. */}
      <p className="mt-auto max-w-[38ch] pt-5 text-[13.5px] leading-[1.6] font-light text-white/50">
        {stop.note}
      </p>
    </div>
  );
}

export function RequirementsSection() {
  return (
    <section id="req" className="relative py-(--section-y)">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <SectionHead
          eyebrow="requirements"
          title="What it needs. What it will not do."
          className="mb-10 sm:mb-15.5"
        >
          Published in full, because a tool asking for this much access should
          tell you exactly where it stops.
        </SectionHead>

        {/* ── What it needs ──────────────────────────────────────────
            The window's own bar is the plate header — controls, a name and
            the one number worth reading, same as the surfaces cards. Only
            the three machine specs live inside it. */}
        <MacWindow
          title={<span className={LABEL}>Requirements</span>}
          trailing={<span className={LABEL}>84 MB &middot; v0.9</span>}
        >
          {/* No rule of its own: the title bar already draws one. */}
          <div className="grid md:grid-cols-3">
            {SPECS.map((spec, i) => (
              <div
                key={spec.k}
                className={cn(
                  "flex flex-col px-6 py-7",
                  i > 0 && "border-t border-border md:border-t-0 md:border-l",
                )}
              >
                {/* Fixed height, marks centred in it: the row is the same
                    in all three columns whatever is standing in it. */}
                <div
                  className={cn(
                    "mb-5 flex items-center justify-between",
                    MARK_SIZE,
                  )}
                >
                  <span className="flex h-full items-center">{spec.mark}</span>
                  <span className={LABEL}>{spec.k}</span>
                </div>
                <p className="text-[clamp(20px,1.9vw,25px)] leading-[1.1] tracking-[-0.028em] text-white">
                  {spec.v}
                </p>
                <p className="mt-1 text-base font-light text-white/52">
                  {spec.sub}
                </p>
                {/* mt-auto pins the note to the bottom, so the hairline
                    lines up across columns even if a value wraps. */}
                <p className="border-t border-border mt-2 pt-2 text-sm leading-normal font-light text-white/45">
                  {spec.note}
                </p>
              </div>
            ))}
          </div>
        </MacWindow>

        {/* ── The other requirement ──────────────────────────────────
            Out of the frame, and headed by the division rather than by
            one side of it. Both columns below are requirements — one
            half needs nothing but the machine on the plate above, the
            other needs a key. A heading naming only the keyed half
            would be contradicted by the first column under it. */}
        <h3 className="mt-11 mb-6 text-[clamp(22px,2.4vw,30px)] sm:mt-16 sm:mb-9 leading-[1.1] font-medium tracking-[-0.03em]">
          What needs a key, and what doesn&rsquo;t.
        </h3>

        {/* Two columns, because this is a comparison. The caveat sits in
            the offline column rather than in a footnote, since it is the
            one thing a reader most needs to weigh. */}
        <div className={cn("grid md:grid-cols-2", BAND, "pt-9")}>
          <Stop stop={STOPS[0]} className="md:pr-14" />
          <Stop
            stop={STOPS[1]}
            className="mt-8 border-t border-border pt-8 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-14"
          />
        </div>

        {/* ── The footnote nobody else prints ────────────────────── */}
        <div
          className={cn(
            "mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-5 font-mono text-xs text-white/40 sm:mt-11",
            BAND,
          )}
        >
          <span>Direct DMG download</span>
          <i aria-hidden className="size-0.75 rounded-full bg-white/22" />
          <span>outside the App Store</span>
          <i aria-hidden className="size-0.75 rounded-full bg-white/22" />
          <span className="text-brand-red-text">not sandboxed</span>
        </div>
      </div>
    </section>
  );
}
