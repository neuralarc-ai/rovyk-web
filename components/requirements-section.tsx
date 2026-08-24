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
   ──────────────────────────────────────────────────────────────────── */

const BAND = "border-t border-border";
const LABEL = "font-mono text-[10px] tracking-[0.18em] text-white/34 uppercase";

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
      className=" size-12 shrink-0 place-items-center rounded border flex items-center justify-center gap-1 border-white/12 bg-black p-1"
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
            "block w-1 h-6 rounded-[1px]",
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
    v: "macOS 15",
    sub: "or later",
    note: "A menu bar utility, not a windowed app.",
  },
  {
    mark: <MemoryMark />,
    k: "Memory",
    v: "16 GB",
    sub: "32 GB recommended",
    note: "To run local models well.",
  },
];

const OFFLINE = ["System control", "Files", "Mail and calendar"];
const KEYED = ["Web browsing", "Web search", "The strongest reasoning"];

export function RequirementsSection() {
  return (
    <section id="req" className="relative py-[clamp(96px,12.5vh,158px)]">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <SectionHead
          eyebrow="requirements"
          title="What it needs. What it will not do."
          className="mb-16"
        >
          Published in full, because a tool asking for this much access should
          tell you exactly where it stops.
        </SectionHead>

        {/* The window's own bar is the plate header — controls, a name and
            the one number worth reading, same as the surfaces cards. */}
        <MacWindow
          title={<span className={LABEL}>Requirements</span>}
          trailing={<span className={LABEL}>84 MB &middot; v0.9</span>}
        >
          {/* ── What it needs ──────────────────────────────────────── */}
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
                <div className="mb-5 flex items-center justify-between">
                  {spec.mark}
                  <span className={LABEL}>{spec.k}</span>
                </div>
                <p className="text-[clamp(20px,1.9vw,25px)] leading-[1.1] tracking-[-0.028em] text-white">
                  {spec.v}
                </p>
                <p className="mt-1 text-[13.5px] font-light text-white/52">
                  {spec.sub}
                </p>
                <p className="mt-4 border-t border-border pt-3.5 text-[12.5px] leading-[1.5] font-light text-white/45">
                  {spec.note}
                </p>
              </div>
            ))}
          </div>

          {/* ── Where it stops ─────────────────────────────────────
              Two columns, because this is a comparison. The caveat sits
              in the offline column rather than in a footnote, since it
              is the one thing a reader most needs to weigh. */}
          <div className={cn("grid md:grid-cols-2", BAND)}>
            <div className="px-6 py-7">
              <div className="mb-5 flex items-center gap-2.5">
                <i
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-brand-green"
                />
                <span className={LABEL}>Works fully offline</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {OFFLINE.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm font-light text-white/85"
                  >
                    <i
                      aria-hidden
                      className="size-1 shrink-0 rounded-full bg-brand-green"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-border pt-4 text-[13px] leading-[1.55] font-light text-white/52">
                Reasoning still runs on-device, and is measurably weaker on
                complex, multi-step work.
              </p>
            </div>

            <div className="border-t border-border px-6 py-7 md:border-t-0 md:border-l">
              <div className="mb-5 flex items-center gap-2.5">
                <i
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full border border-white/45"
                />
                <span className={LABEL}>Needs your own key</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {KEYED.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm font-light text-white/85"
                  >
                    <i
                      aria-hidden
                      className="size-1 shrink-0 rounded-full border border-white/40"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-border pt-4 text-[13px] leading-[1.55] font-light text-white/52">
                Your provider, your key, your bill. Nothing is billed through
                us, and none of it is on by default.
              </p>
            </div>
          </div>

          {/* ── The footnote nobody else prints ────────────────────── */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-2.5 gap-y-1 px-6 py-4 font-mono text-[11.5px] text-white/40",
              BAND,
            )}
          >
            <span>Direct DMG download</span>
            <i aria-hidden className="size-[3px] rounded-full bg-white/22" />
            <span>outside the App Store</span>
            <i aria-hidden className="size-[3px] rounded-full bg-white/22" />
            <span className="text-brand-red-text">not sandboxed</span>
          </div>
        </MacWindow>
      </div>
    </section>
  );
}
