import { DownloadButton } from "@/components/cta-button";
import { ENTITY } from "@/lib/legal";
import { Kicker } from "@/components/kicker";
import { RovykWordmark } from "@/components/rovyk-wordmark";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ────────────────────────────────────────────────────────────────────
   The footer — the sheet's last surface, and the page's index.

   Two bands separated by a hairline: who made this, how to reach them
   and where else to go, then the small print. The reference's own
   proportions — a wide left column against a narrower right one —
   which is what keeps the brand reading as the content, and the
   address and links as the margin running down beside it.

   It darkens downwards, from the sheet's own ground to a shade below
   it, so the page has a floor rather than simply stopping.
   ──────────────────────────────────────────────────────────────────── */

const LINKS: { heading: string; items: [label: string, href: string][] }[] = [
  {
    heading: "product",
    /* The nav's labels and the nav's order. The same two sections were
       "Surfaces" and "Capabilities" here, "Where it lives" and "Features" in
       the nav, and listed second-then-first — three names for two places,
       and an index that disagreed with the page it indexes. */
    items: [
      ["Where it lives", "#where"],
      ["What it can do", "#features"],
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
    ],
  },
  {
    /* Where the social links were. A product asking for Accessibility
       access and an unsandboxed install owes the reader these two more
       than it owes them a follow button — and we had neither an account
       to link nor a community to send them to. */
    heading: "legal",
    items: [
      ["Terms of Use", "/terms"],
      ["Privacy Policy", "/privacy"],
    ],
  },
];

/** Two columns, wide over narrow, used for both of the upper bands. */
const BAND = "grid gap-10 md:grid-cols-[1.35fr_1fr]";

const DOT = "size-0.75 shrink-0 rounded-full bg-white/30";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden rounded-b-4xl border-t border-input [background:linear-gradient(180deg,var(--background)_0%,var(--muted)_46%,#141414_100%)]">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4">
        {/* ── Who this is, how to reach them, where else to go ───── */}
        <div className={cn(BAND, "items-start pt-14 pb-12")}>
          <div>
            <RovykWordmark className="mb-5 h-[clamp(20px,2.2vw,32px)] text-white" />

            <p className="max-w-[44ch] text-sn leading-[1.65] font-light text-white/58">
              A voice agent that lives in the notch and operates your Mac. Local
              by default, cloud by choice, and honest about both.
            </p>

            {/* Who made this — which is the one of this band's three jobs
                it was not doing. The name is the door: this is the end of
                the page, and the company is the only thing here worth
                leaving for. A new tab, so leaving is not the same as
                going. */}
            <p className="mt-4 text-sn font-light text-white/44">
              A{" "}
              <a
                href={ENTITY.site}
                target="_blank"
                rel="noreferrer"
                className="border-b border-input pb-px text-white/68 transition-colors duration-200 hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {ENTITY.name}
              </a>{" "}
              product
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <DownloadButton>Download for Apple Silicon</DownloadButton>
            </div>
          </div>

          {/* The margin column: how to reach them, then where else to go.
              These were two bands until the newsletter came out from
              between them, and a band whose only content is a link index
              is a hairline drawn across a gap. */}
          <div className="flex flex-col gap-11 md:items-end md:text-right">
            {/* A real address, set at headline size. The page has spent
                nine sections arguing it is answerable for what it does; a
                support form would have undercut that in one line. */}
            <div className="flex flex-col gap-3">
              <Kicker>contact us through e-mail</Kicker>
              <a
                href="mailto:hello@neuralarc.ai"
                className="text-[clamp(20px,2.4vw,33px)] tracking-[-0.028em] transition-opacity duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                hello@neuralarc.ai
              </a>
            </div>

            <nav
              aria-label="Footer"
              className="grid w-full grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 md:justify-items-end md:text-right"
            >
              {LINKS.map((column) => (
                <div
                  key={column.heading}
                  className="flex flex-col md:items-end"
                >
                  <Kicker className="mb-4">{column.heading}</Kicker>
                  {column.items.map(([label, href]) => {
                    /* Hashes stay plain anchors — Lenis owns those and a
                       router push would only get in the way. A real route
                       is a route, and gets the router. */
                    const El = href.startsWith("/") ? Link : "a";
                    return (
                      <El
                        key={label}
                        href={href}
                        className="py-1.25 text-sm text-white/68 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {label}
                      </El>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* ── The small print ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 border-t border-border pt-5 pb-6 text-[12.5px] text-white/44 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <p className="flex flex-wrap items-center gap-3">
            {/* The entity, not the product: a copyright notice naming a
                brand is a notice naming nobody who can hold one. */}
            <span>&copy; 2026 {ENTITY.legal}</span>
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
