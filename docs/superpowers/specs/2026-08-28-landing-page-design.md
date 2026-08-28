# Apple-style landing page at `/`, current site moves to `/rovyk`

## Goal

Add a new, minimal, video-led landing page at the site root (`/`),
Apple-product-page style. The site's current homepage (intro
performance, hero, all marketing sections, full nav, full footer)
moves to `/rovyk` unchanged in content. The new landing page's
"Learn more" action points at `/rovyk`.

## Non-goals

- No light/white theme. This stays on the existing dark palette and
  component tokens — "Apple-inspired" describes the layout (whitespace,
  centering, restraint), not a colour-scheme change.
- No real video asset yet. The hero video section ships with a static,
  scalable placeholder (poster image, no playback) that the user will
  swap in later by providing a file, the same way the intro section's
  voice clip was wired in.
- `/privacy` and `/terms` do not move. They stay part of the "current
  site" experience (same nav, same footer) at their existing paths.

## Routing restructure

Today, `app/layout.tsx` renders `<NotchNav />` globally, and
`app/page.tsx` holds the entire current homepage. `/privacy` and
`/terms` get their nav for free from the root layout; they render their
own footer via `LegalPage` → `SiteFooter`.

Target structure:

```
app/
  layout.tsx              — html/body/fonts/SmoothScroll/WaitlistProvider only
                             (NotchNav removed from here)
  page.tsx                — NEW landing page
  opengraph-image.tsx     — NEW landing-page OG image
  (site)/                 — route group, adds NotchNav for everything
                             that is "the current site"
    layout.tsx            — renders <NotchNav /> around {children}
    rovyk/
      page.tsx             — moved verbatim from today's app/page.tsx
      opengraph-image.tsx  — moved verbatim from today's app/opengraph-image.tsx
    privacy/
      page.tsx             — moved verbatim
      opengraph-image.tsx  — moved verbatim
    terms/
      page.tsx             — moved verbatim
      opengraph-image.tsx  — moved verbatim
```

A route group (`(site)`) is used rather than duplicating `<NotchNav />`
into three separate layouts, and rather than adding it to the new
landing page and then hiding it there — the landing page never renders
it at all.

`WaitlistProvider` and `SmoothScroll` stay in the true root layout:
both the new landing page's Download button and the existing site's
need the waitlist dialog, and Lenis-driven smooth scroll is a
page-wide concern either way.

### Metadata

- Root `app/layout.tsx` metadata (`canonical: "/"`, title, description)
  is rewritten to describe the new landing page.
- `app/(site)/rovyk/page.tsx` gets its own page-level
  `export const metadata`, with `alternates: { canonical: "/rovyk" }`
  and the current title/description (verbatim from today's root
  layout) — a page's own `metadata` export overrides the parent
  layout's for the fields it sets, so this does not need a layout of
  its own just to carry it.
- `app/(site)/rovyk/opengraph-image.tsx` — moved verbatim.
- `app/opengraph-image.tsx` (new, at root) — new OG copy for the landing page.

### Sitemap

`app/sitemap.ts` is a hand-maintained list (by design — see its own
comment: "a route that goes missing from here is a route somebody
deleted"). Add `/rovyk` as a fourth entry, `priority: 1` alongside the
existing root entry, whose priority drops to something below 1 (the
landing page is now the primary entry point). Existing `/privacy` and
`/terms` entries are untouched.

## New components (`components/landing/`)

One file per concern, matching the rest of the codebase's pattern
(small, single-purpose components; data/copy as a local constant beside
the component that renders it, unless it's genuinely shared).

- **`landing-notch-nav.tsx`** — supersedes the earlier plain-bar plan
  (revised twice after spec review). Reuses the site's actual notch
  shape — same bezel strips, same `Fillet`, same `RovykWordmark`, same
  `lib/notch.ts` geometry and easing constants — rather than a generic
  Apple-style bar, so the landing page is framed the same way the rest
  of the site is. What distinguishes it from `NotchNav` is entirely
  about links, not motion:
  - **No links, ever.** `LINKS_L`/`LINKS_R` are not rendered — the pill
    holds only the wordmark, on every device. There is nothing to put
    in a drawer, so there is no touch/drawer variant to build at all —
    unlike `NotchNav`, this component does not branch on pointer
    capability.
  - **The hover expand/collapse motion is kept**, because it is worth
    keeping on its own: on a hover-capable device the pill sits shut
    (just "R") and opens to the full "ROVYK" wordmark on hover/focus,
    exactly `NotchNavPointer`'s existing width/height/opacity transition
    and per-letter stagger — just with no `NavSide` rails widening
    alongside it.
  - **Touch is the one place it statically expands** — with no hover to
    ever trigger the reveal, a touch visitor would otherwise never see
    past the collapsed "R". So on `!(hover: hover) and (pointer: fine)`
    it renders permanently at the open size instead, no interaction
    needed, same `matchMedia` check `NotchNav` already uses for that
    split.
  - Still drops in from the bezel once on mount, same timing as
    `NotchNav`, so the arrival motion matches sitewide.

  The three-strip bezel markup (`NotchNav`'s top-level `<div aria-hidden>`
  block) is extracted into a small shared `NotchBezel` component in
  `components/notch-fillet.tsx` — the file that already holds the other
  piece (`Fillet`) both navs share — so the frame can't drift between
  the two independent copies.
- **`landing-hero.tsx`** — "Rovyk for macOS" as the large title, one
  line of supporting copy beneath, generous top/bottom whitespace
  before the video.
- **`landing-video.tsx`** — 16:9 frame, sized `min(1100px, 78vw)` (the
  same "cap in px, shrink as a share of viewport below that" pattern
  `hero-section.tsx` already uses for its own frame), rounded corners
  + soft shadow matching the existing `MacWindow`/hero-frame shadow
  language. Renders a poster image (reusing `hero-wall.jpg`, the
  asset already used for this kind of moody backdrop elsewhere on the
  site) with a centred play glyph, decorative only for now — no `<video>`
  element or playback wiring until a real file exists. Structured so
  dropping in a real `<video src>` later is a small, contained change
  to this one file.
- **`landing-action.tsx`** — `<DownloadButton>` (reused as-is, so
  `WAITLIST_MODE` keeps controlling every download CTA site-wide), a
  "Learn more" link/button to `/rovyk`, and a small compatibility row
  ("macOS 27+ · Apple Silicon"), all centred directly under the video
  with no visual gap separating it from the video block.
- **`landing-features.tsx`** — three equal columns, hairline dividers
  between them (desktop), each a small line icon (Phosphor, matching
  the icon weight already used elsewhere — `weight="regular"` /
  `"light"`), a short title, one line of description. Copy:
  1. **On-device by default** — Hearing and reasoning run locally.
     Nothing leaves your Mac unless you choose otherwise.
  2. **Sixty-one tools, one loop** — Reads mail, drives apps, browses
     the web, moves files — and picks the right tool itself.
  3. **A gate before anything irreversible** — Sending, moving,
     deleting: confirmed before it runs, not after.
- **`landing-footer.tsx`** — minimal: small wordmark, `/privacy` +
  `/terms` links, one copyright line. Explicitly not `SiteFooter` (no
  product link index, no contact block, no download CTA repeated here)
  — "very light visual weight" per the brief.

`app/page.tsx` composes these five in the order: nav → hero → video →
action → features → footer. Revised along with the nav: since the notch
pill only reads correctly carved into the bezel it hangs from, the page
gets the same `m-(--gut) rounded-4xl bg-background` inset "sheet" the
rest of the site uses (`app/(site)/rovyk/page.tsx` keeps its own copy
of that wrapper, unchanged) — this is no longer a piece of "current
site" identity being withheld from the landing page, it comes with
reusing the notch nav.

## Verification

- `next build` succeeds; both `/` and `/rovyk` render.
- `/rovyk`, `/privacy`, `/terms` are visually unchanged from today
  (same nav, same footer, same content) — a diff against current
  production screenshots should show no change outside the new file
  paths.
- New landing page: notch nav present, bezel framing the sheet, no
  link rails on hover, wordmark expands on hover/focus (pointer) or
  sits expanded permanently (touch), hero copy present, video
  placeholder renders at the specified proportions, Download button
  respects `WAITLIST_MODE`, "Learn more" resolves to `/rovyk`, three
  feature cards render, footer links to `/privacy` and `/terms`
  resolve.
- `sitemap.xml` includes `/rovyk`.
- No new console errors (checked the same way prior sections in this
  session were checked — a headless-browser smoke pass).
