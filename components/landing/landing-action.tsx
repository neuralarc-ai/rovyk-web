import { DownloadButton, GhostButton } from "@/components/cta-button";

/** Facts, not claims — checkable before downloading. */
const COMPAT = ["macOS 27+", "Apple Silicon"];

/**
 * Directly under the video, with no gap of its own — the video is the
 * pitch, this is the one decision it's asking for. `DownloadButton` is
 * reused untouched, so `WAITLIST_MODE` keeps deciding "Download" vs.
 * "Join the waitlist" the same way it does everywhere else on the site.
 */
export function LandingAction() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-9 pb-[clamp(64px,9vh,112px)] sm:px-10">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <DownloadButton>Download for Mac</DownloadButton>
        <GhostButton href="/rovyk">Learn more</GhostButton>
      </div>

      <div className="flex gap-4 text-xs text-white/50">
        {COMPAT.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}
