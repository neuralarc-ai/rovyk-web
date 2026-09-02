import type { Metadata } from "next";
import Link from "next/link";
import { CTA_BASE, CTA_PRIMARY } from "@/components/cta-button";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";
import { MissedRoute } from "@/components/missed-route";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   404.

   The same shell as the landing page — notch nav, inset sheet, light
   footer — and nothing else in it. The number is the headline, at the
   size the page would give a headline, because it is the one fact the
   reader came here to learn; everything under it is the same fact in
   words, then the address it applies to, then the way out. The footer
   already carries the other links.
   ──────────────────────────────────────────────────────────────────── */

/* Next applies a `metadata` export from `not-found.tsx`, and injects
   `noindex` on a 404 itself — so the tab is the only thing left to say. */
export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <>
      <LandingNotchNav />

      <div className="relative m-(--gut) flex min-h-[calc(100svh-2*var(--gut))] flex-col rounded-4xl bg-background">
        {/* Centred in whatever is left over, with the top padding standing
            in as the notch's clearance on a screen too short to have any
            left over. */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 pt-[clamp(112px,16vh,180px)] pb-(--section-y) text-center sm:px-10">
          {/* Tabular, so the three digits sit on their own widths rather
              than on a proportional face's opinion of a zero. Leading is
              cut well below 1 because there is only ever one line of it
              and the default would hang the block low in its own box. */}
          <p className="text-[clamp(88px,15vw,200px)] leading-[0.82] font-medium tracking-[-0.05em] tabular-nums">
            404
          </p>

          <h1 className="mt-7 text-[clamp(22px,2.6vw,34px)] leading-[1.15] font-medium tracking-[-0.03em] text-balance">
            Nothing at that address.
          </h1>

          <p className="mt-3 max-w-[42ch] text-[clamp(15px,1.2vw,17px)] leading-[1.6] font-light tracking-[-0.004em] text-muted-foreground">
            The page was moved, mistyped, or never written.
          </p>

          <MissedRoute />

          <Link
            href="/"
            className={cn(CTA_BASE, CTA_PRIMARY, "mt-9 w-full sm:w-52")}
          >
            Back to home
          </Link>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
