# Apple-style landing page at `/`, current site moves to `/rovyk`

## Goal

Add a new, minimal, video-led landing page at the site root (`/`),
Apple-product-page style. The site's current homepage (intro
performance, hero, all marketing sections, full nav, full footer)
moves to `/rovyk` unchanged in content. The new landing page's
"Learn more" and "Explore the full site" actions point at `/rovyk`.

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

- **`landing-nav.tsx`** — `<AppleLogo>` left, "Rovyk for macOS" centered,
  a small link ("Explore the full site") right, `href="/rovyk"`. Not
  sticky/scroll-reactive like `NotchNav` — a plain top bar.
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
action → features → footer, each full-bleed section on
`bg-background`, no `--gut`-inset sheet (the sheet treatment is part of
the *current* site's visual identity, not requested here).

## Verification

- `next build` succeeds; both `/` and `/rovyk` render.
- `/rovyk`, `/privacy`, `/terms` are visually unchanged from today
  (same nav, same footer, same content) — a diff against current
  production screenshots should show no change outside the new file
  paths.
- New landing page: nav present, hero copy present, video placeholder
  renders at the specified proportions, Download button respects
  `WAITLIST_MODE`, "Learn more" and the nav's secondary link both
  resolve to `/rovyk`, three feature cards render, footer links to
  `/privacy` and `/terms` resolve.
- `sitemap.xml` includes `/rovyk`.
- No new console errors (checked the same way prior sections in this
  session were checked — a headless-browser smoke pass).
