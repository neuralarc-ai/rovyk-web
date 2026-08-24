import { DownloadButton, GhostButton } from "@/components/cta-button";
import { NewsletterForm } from "@/components/newsletter-form";
import { RovykWordmark } from "@/components/rovyk-wordmark";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The footer — the sheet's last surface, and the page's index.

   Three bands separated by hairlines, each answering a different
   question: who made this and how to reach them, what to do next, and
   the small print. The reference's own proportions — a wide left
   column against a narrower right one, twice — which is what keeps the
   brand and the newsletter reading as the content and the addresses
   and links as the margin.

   It darkens downwards, from the sheet's own ground to a shade below
   it, so the page has a floor rather than simply stopping. The grid
   behind it blooms out of the top edge and is gone by halfway, which
   makes the hairline the footer starts on read as a horizon rather
   than a border.
   ──────────────────────────────────────────────────────────────────── */

/** The footer's small caps, bracketed the way every eyebrow on this page
 *  is. Brackets dimmer than the word, so they read as punctuation rather
 *  than as two more characters. */
function Kicker({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.16em] text-white/40 uppercase",
        className,
      )}
    >
      <span className="text-white/22">[</span>
      {children}
      <span className="text-white/22">]</span>
    </span>
  );
}

const LINKS: { heading: string; items: [label: string, href: string][] }[] = [
  {
    heading: "product",
    items: [
      ["Capabilities", "#features"],
      ["Surfaces", "#where"],
      ["How it works", "#how"],
      ["What sets it apart", "#uses"],
    ],
  },
  {
    heading: "resources",
    items: [
      ["Control", "#safe"],
      ["Requirements", "#req"],
      ["FAQ", "#faq"],
      ["Privacy", "#"],
    ],
  },
  {
    heading: "social",
    items: [
      ["X", "#"],
      ["GitHub", "#"],
      ["Discord", "#"],
    ],
  },
];

/** Two columns, wide over narrow, used for both of the upper bands. */
const BAND = "grid gap-10 md:grid-cols-[1.35fr_1fr]";

const DOT = "size-[3px] shrink-0 rounded-full bg-white/30";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden rounded-b-4xl border-t border-input [background:linear-gradient(180deg,var(--background)_0%,var(--muted)_46%,#141414_100%)]">
      {/* Bloomed out of the top edge and gone by halfway — the surface has
          a texture where it meets the page and none where it ends. */}
      <div
        aria-hidden
        className="bg-hairline-grid mask-grid-top pointer-events-none absolute inset-0 [--grid-size:150px]"
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 sm:px-10">
        {/* ── Who this is, and how to reach them ──────────────────── */}
        <div className={cn(BAND, "items-start pt-14 pb-12")}>
          <div>
            <RovykWordmark className="mb-[18px] h-[clamp(21px,2.2vw,27px)] text-white" />

            <p className="max-w-[40ch] text-sm leading-[1.65] font-light text-white/58">
              A voice agent that lives in the notch and operates your Mac. Local
              by default, cloud by choice, and honest about both.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <DownloadButton>Download for Apple Silicon</DownloadButton>
              <GhostButton href="#">Changelog</GhostButton>
            </div>
          </div>

          {/* A real address, set at headline size. The page has spent nine
              sections arguing it is answerable for what it does; a support
              form would have undercut that in one line. */}
          <div className="flex flex-col gap-3 md:items-end md:text-right">
            <Kicker>contact us through e-mail</Kicker>
            <a
              href="mailto:hello@rovyk.app"
              className="text-[clamp(20px,2.4vw,33px)] tracking-[-0.028em] transition-opacity duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              hello@rovyk.app
            </a>
          </div>
        </div>

        {/* ── What to do next ─────────────────────────────────────── */}
        <div
          className={cn(BAND, "items-start border-t border-border pt-11 pb-12")}
        >
          <div>
            <Kicker>newsletter</Kicker>
            <h2 className="mt-3.5 mb-5 text-[clamp(22px,2.4vw,29px)] font-medium tracking-[-0.03em]">
              Stay connected
            </h2>
            <NewsletterForm />
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 md:justify-items-end md:text-right"
          >
            {LINKS.map((column) => (
              <div key={column.heading} className="flex flex-col md:items-end">
                <Kicker className="mb-4">{column.heading}</Kicker>
                {column.items.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    className="py-[5px] text-sm text-white/68 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* ── The small print ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 border-t border-border pt-5 pb-6 text-[12.5px] text-white/44 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <p className="flex flex-wrap items-center gap-3">
            <span>&copy; 2026 Rovyk</span>
            <i aria-hidden className={DOT} />
            <span>All rights reserved</span>
          </p>
          <p className="flex flex-wrap items-center gap-3">
            <span>Built for Apple Silicon</span>
            <i aria-hidden className={DOT} />
            {/* Decorative here — the mark at the top of the footer already
                names the product, and a screen reader does not need it twice.
                Hidden on the wrapper, since the component names itself. */}
            <span aria-hidden className="contents">
              <RovykWordmark className="h-[0.85em] opacity-50" />
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
