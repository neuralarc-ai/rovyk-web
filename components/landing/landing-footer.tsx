import Link from "next/link";
import { RovykWordmark } from "@/components/rovyk-wordmark";

/**
 * Deliberately light — a wordmark and two legal links, not the full
 * `SiteFooter` (no product index, no contact block, no repeated CTA).
 * The landing page's whole pitch is the video and the button above it;
 * the footer's job is just to not compete with that.
 */
export function LandingFooter() {
  return (
    <footer className="rounded-b-4xl border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-8 text-xs text-white/44 sm:flex-row sm:justify-between sm:px-10">
        <RovykWordmark className="h-3.5 opacity-60" />

        <div className="flex items-center gap-5">
          <Link
            href="/privacy"
            className="transition-colors duration-200 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="transition-colors duration-200 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Terms of Use
          </Link>
          <span>&copy; 2026 Rovyk</span>
        </div>
      </div>
    </footer>
  );
}
