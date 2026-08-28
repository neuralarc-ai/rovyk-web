import { AppleLogo } from "@/components/apple-logo";
import { DownloadButton, GhostButton } from "@/components/cta-button";
import { ChipMark, MARK_SIZE } from "@/components/requirements-section";
import { cn } from "@/lib/utils";

const LABEL =
  "font-mono text-[10px] tracking-[0.18em] text-white/34 uppercase";

/* Same two marks the requirements section plates — reused, not redrawn,
   so "Apple Silicon" and "macOS 27" look like the same claim wherever
   the page makes it. Memory is left out here: this is a landing-page
   teaser reaching for the download, not the full spec label. */
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
];

/**
 * The page's closing beat: what it needs, right beside what to do about
 * it. 60% card, 20% Download, 20% Learn more — one row on a wide screen,
 * stacked in reading order (specs, then the two actions) below `md`.
 */
export function LandingSpecs() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-[clamp(64px,9vh,112px)] sm:px-10">
      <div className="grid gap-5 md:grid-cols-[3fr_1fr_1fr] md:items-center">
        <div className="grid overflow-hidden rounded-3xl border border-border bg-card sm:grid-cols-2">
          {SPECS.map((spec, i) => (
            <div
              key={spec.k}
              className={cn(
                "flex flex-col px-6 py-6",
                i > 0 && "border-t border-border sm:border-t-0 sm:border-l",
              )}
            >
              <div
                className={cn(
                  "mb-4 flex items-center justify-between",
                  MARK_SIZE,
                )}
              >
                <span className="flex h-full items-center">{spec.mark}</span>
                <span className={LABEL}>{spec.k}</span>
              </div>
              <p className="text-[clamp(18px,1.7vw,22px)] leading-[1.1] tracking-[-0.026em] text-white">
                {spec.v}
              </p>
              <p className="mt-1 text-sm font-light text-white/52">
                {spec.sub}
              </p>
              <p className="mt-2 border-t border-border pt-2 text-[13px] leading-normal font-light text-white/45">
                {spec.note}
              </p>
            </div>
          ))}
        </div>

        <DownloadButton className="w-full">Download for Mac</DownloadButton>
        <GhostButton href="/rovyk" className="w-full">
          Learn more
        </GhostButton>
      </div>
    </div>
  );
}
