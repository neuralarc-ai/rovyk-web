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
 * it. The card spans two of the same three columns `LandingFeatures`
 * draws above it — same container, same `sm:grid-cols-3`, zero column
 * gap — so its right edge sits exactly on the line the features grid's
 * second divider does. The breathing room before the buttons is their
 * own left padding, not a grid gap: a gap would have eaten into the
 * column math and pulled the card's edge off that line by a few
 * pixels. Download sits above Learn more in the remaining third — the
 * one action worth defaulting to goes first.
 */
export function LandingSpecs() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-[clamp(64px,9vh,112px)] sm:px-10">
      <div className="grid gap-y-6 sm:grid-cols-3 sm:items-center sm:gap-x-0">
        <div className="grid overflow-hidden rounded-3xl border border-border bg-card sm:col-span-2 sm:grid-cols-2">
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

        <div className="flex flex-col gap-3 sm:items-center sm:pl-6">
          <DownloadButton className="w-full sm:w-52">
            Download for Mac
          </DownloadButton>
          <GhostButton href="/rovyk" className="w-full sm:w-52">
            Learn more
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
