# Apple-Style Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal, video-led Apple-style landing page at `/`, moving the current homepage (intro, hero, all marketing sections, full nav, full footer) to `/rovyk` unchanged.

**Architecture:** A new route group `app/(site)/` carries `<NotchNav />` around everything that is "the current site" (`/rovyk`, `/privacy`, `/terms`), so the new root `app/page.tsx` can render without it. The new page composes six small, single-purpose components under `components/landing/`, reusing existing primitives (`DownloadButton`, `Fillet`, `RovykWordmark`, `lib/notch.ts` constants) rather than inventing parallel ones.

**Tech Stack:** Next.js App Router, React, Tailwind v4 (utility classes, no CSS modules), `@phosphor-icons/react`, `next/image`. No test framework exists in this repo — verification is `tsc --noEmit`, `eslint`, and a headless-Chromium (Playwright, installed ad hoc with `--no-save`) smoke pass, matching how every prior feature in this codebase's history has been checked.

**Spec:** `docs/superpowers/specs/2026-08-28-landing-page-design.md`

## Global Constraints

- No light/white theme — stays on the existing dark palette and component tokens.
- No real video file yet — `landing-video.tsx` ships a static poster placeholder; a real `<video>` is a later, contained change to that one file.
- `/privacy` and `/terms` do not move paths, only physical file location (into the `(site)` route group) — URLs are unaffected.
- The landing page's Download button reuses `<DownloadButton>` as-is (`WAITLIST_MODE` keeps controlling it site-wide).
- The landing nav has no link rails on any device, keeps `NotchNavPointer`'s hover/focus expand-collapse motion on pointer-capable devices, and sits permanently expanded on touch.
- `app/sitemap.ts` must list `/rovyk`.

---

## Task 1: Extract `NotchBezel` into a shared component

**Files:**
- Modify: `components/notch-fillet.tsx`
- Modify: `components/notch-nav.tsx:293-299`
- Test: manual (no test framework) — visual diff + `tsc`/`eslint`

**Interfaces:**
- Produces: `NotchBezel()` — a component with no props, exported from `components/notch-fillet.tsx` alongside the existing `Fillet` export. Renders the three fixed black frame strips (top/left/right, each `var(--gut)` thick).

- [ ] **Step 1: Add `NotchBezel` to `components/notch-fillet.tsx`**

Append this export at the end of the file (after the existing `Fillet` function):

```tsx
/**
 * The three fixed frame strips every page with a notch nav sits inside —
 * top, left, right, each `--gut` thick. Shared so `NotchNav` and the
 * landing page's own nav can't quietly disagree about how thick the
 * frame is or which edges it covers.
 */
export function NotchBezel() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-90">
      <div className="absolute inset-x-0 top-0 h-(--gut) bg-black" />
      <div className="absolute inset-y-0 left-0 w-(--gut) bg-black" />
      <div className="absolute inset-y-0 right-0 w-(--gut) bg-black" />
    </div>
  );
}
```

- [ ] **Step 2: Use it from `components/notch-nav.tsx`**

In `components/notch-nav.tsx`, change the import line:

```tsx
import { Fillet } from "@/components/notch-fillet";
```

to:

```tsx
import { Fillet, NotchBezel } from "@/components/notch-fillet";
```

Then find this block inside `export function NotchNav()` (around line 293):

```tsx
      {/* ── Bezel ─────────────────────────────────────────────────────
          Three fixed strips. Invisible over the black intro, and framing
          from the hero onward — which is what makes the notch read as
          carved out of hardware rather than a bar floating on the page. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-90">
        <div className="absolute inset-x-0 top-0 h-(--gut) bg-black" />
        <div className="absolute inset-y-0 left-0 w-(--gut) bg-black" />
        <div className="absolute inset-y-0 right-0 w-(--gut) bg-black" />
      </div>
```

Replace it with:

```tsx
      {/* ── Bezel ─────────────────────────────────────────────────────
          Three fixed strips. Invisible over the black intro, and framing
          from the hero onward — which is what makes the notch read as
          carved out of hardware rather than a bar floating on the page. */}
      <NotchBezel />
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/notch-fillet.tsx components/notch-nav.tsx`
Expected: no output (clean) from both.

- [ ] **Step 4: Visual smoke check**

Run: `npm run dev` in the background, wait for it to serve (`curl -sf http://localhost:3000`), then screenshot the homepage nav area with a headless browser (Playwright, `npm install --no-save playwright` if not already present) to confirm the bezel and notch render identically to before. Kill the dev server after.

- [ ] **Step 5: Commit**

```bash
git add components/notch-fillet.tsx components/notch-nav.tsx
git commit -m "refactor(nav): extract NotchBezel so it can be shared with the landing nav"
```

---

## Task 2: Move the current site to `/rovyk`

**Files:**
- Create: `app/(site)/layout.tsx`
- Move: `app/page.tsx` → `app/(site)/rovyk/page.tsx`
- Move: `app/opengraph-image.tsx` → `app/(site)/rovyk/opengraph-image.tsx`
- Move: `app/privacy/page.tsx` → `app/(site)/privacy/page.tsx`
- Move: `app/privacy/opengraph-image.tsx` → `app/(site)/privacy/opengraph-image.tsx`
- Move: `app/terms/page.tsx` → `app/(site)/terms/page.tsx`
- Move: `app/terms/opengraph-image.tsx` → `app/(site)/terms/opengraph-image.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/notch-nav.tsx:133,197`
- Modify: `components/notch-nav-touch.tsx:152,507`
- Modify: `app/sitemap.ts`
- Create (stub): `app/page.tsx`
- Test: manual — `next build`, route-by-route smoke check

**Interfaces:**
- Consumes: `NotchBezel` from Task 1 (unchanged usage inside `NotchNav`).
- Produces: `/rovyk`, `/privacy`, `/terms` serving exactly what `/`, `/privacy`, `/terms` serve today. `/` serves a minimal valid stub (filled in by Tasks 3–8).

- [ ] **Step 1: Move the route files**

```bash
mkdir -p app/\(site\)/rovyk app/\(site\)/privacy app/\(site\)/terms
git mv app/page.tsx app/\(site\)/rovyk/page.tsx
git mv app/opengraph-image.tsx app/\(site\)/rovyk/opengraph-image.tsx
git mv app/privacy/page.tsx app/\(site\)/privacy/page.tsx
git mv app/privacy/opengraph-image.tsx app/\(site\)/privacy/opengraph-image.tsx
git mv app/terms/page.tsx app/\(site\)/terms/page.tsx
git mv app/terms/opengraph-image.tsx app/\(site\)/terms/opengraph-image.tsx
rmdir app/privacy app/terms
```

- [ ] **Step 2: Give `/rovyk` its own metadata**

`app/(site)/rovyk/page.tsx` currently has no `metadata` export (it inherited the root layout's). Add one at the top, right after the imports, moving the title/description/canonical that are about to be stripped from the root layout in Step 4:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/rovyk" },
  title: "Rovyk: voice agent for macOS",
  description:
    "Talk to your Mac and watch it work. Rovyk lives in the menu bar and operates your machine. Local by default.",
};
```

(Keep the existing default export `Page` below it unchanged.)

- [ ] **Step 3: Create the shared `(site)` layout**

Create `app/(site)/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { NotchNav } from "@/components/notch-nav";

/**
 * Everything that is "the current site" — `/rovyk`, `/privacy`, `/terms` —
 * shares this one nav. The new landing page at `/` sits outside this
 * group entirely and never renders `NotchNav`.
 *
 * Typed as plain `{ children: ReactNode }` rather than the generated
 * `LayoutProps<'/rovyk'>` helper the root layout uses: this layout is
 * shared across three sibling routes under a route group, not the
 * single literal path that helper names, and it has no params of its
 * own to type either way.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NotchNav />
      {children}
    </>
  );
}
```

- [ ] **Step 4: Strip `NotchNav` and the old metadata from the root layout**

In `app/layout.tsx`, remove the import:

```tsx
import { NotchNav } from "@/components/notch-nav";
```

Remove `<NotchNav />` from the JSX (it currently sits right before `{children}` inside `<WaitlistProvider>`), leaving:

```tsx
          <WaitlistProvider>
            {children}
          </WaitlistProvider>
```

Replace the `metadata` export (currently describing the old homepage) with a landing-page-focused placeholder — Task 8 finalizes the copy once the page itself is built, but the shape must be right now so `/rovyk`'s canonical isn't accidentally duplicated:

```tsx
export const metadata: Metadata = {
  metadataBase: SITE_ORIGIN,
  alternates: { canonical: "/" },
  title: "Rovyk for macOS",
  description: "Rovyk for macOS.",
};
```

- [ ] **Step 5: Fix the "am I home?" check in both nav components**

`NotchNav`'s link-prefixing logic (`linkHref`, `reachedSection`) decides whether an anchor like `#where` should stay a plain in-page anchor or become `/rovyk#where` — that decision is keyed off whether the current page IS the one those anchors live on. Since `/rovyk` is now that page, not `/`:

In `components/notch-nav.tsx`, line 133:

```tsx
  const home = usePathname() === "/";
```

becomes:

```tsx
  const home = usePathname() === "/rovyk";
```

And line 197, the logo's link:

```tsx
          href="/"
```

becomes:

```tsx
          href="/rovyk"
```

In `components/notch-nav-touch.tsx`, line 152:

```tsx
  const home = usePathname() === "/";
```

becomes:

```tsx
  const home = usePathname() === "/rovyk";
```

And line 507, the logo's link:

```tsx
              href="/"
```

becomes:

```tsx
              href="/rovyk"
```

- [ ] **Step 6: Add `/rovyk` to the sitemap**

In `app/sitemap.ts`, the current root entry:

```tsx
    {
      // `SITE_URL`, not `absoluteUrl("/")`, so this is byte-identical to
      // the canonical the page emits. The two are equivalent for a root
      // path, but a sitemap that disagrees with a canonical is a thing
      // somebody eventually has to rule out.
      url: SITE_URL,
      lastModified: BUILT_AT,
      changeFrequency: "weekly",
      priority: 1,
    },
```

becomes two entries — the landing page stays priority 1 as the primary entry point, `/rovyk` is the deep-dive right behind it:

```tsx
    {
      // `SITE_URL`, not `absoluteUrl("/")`, so this is byte-identical to
      // the canonical the page emits. The two are equivalent for a root
      // path, but a sitemap that disagrees with a canonical is a thing
      // somebody eventually has to rule out.
      url: SITE_URL,
      lastModified: BUILT_AT,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/rovyk"),
      lastModified: BUILT_AT,
      changeFrequency: "weekly",
      priority: 0.9,
    },
```

- [ ] **Step 7: Create the temporary landing-page stub**

Create `app/page.tsx` (Tasks 3–8 progressively replace its body):

```tsx
export default function Page() {
  return (
    <main className="grid min-h-svh place-items-center bg-background text-white">
      <p className="text-sm text-white/40">Landing page under construction.</p>
    </main>
  );
}
```

- [ ] **Step 8: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint app components/notch-nav.tsx components/notch-nav-touch.tsx`
Expected: no output from either.

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: build succeeds; route list in the output includes `/`, `/rovyk`, `/privacy`, `/terms`.

- [ ] **Step 10: Route-by-route smoke check**

Start the dev server (`npm run dev`, poll `curl -sf http://localhost:3000` until ready) and, with a headless browser:
- Load `/rovyk` — confirm the intro performance, hero, and `NotchNav` all render as before, and clicking the nav's wordmark keeps you on `/rovyk`.
- Load `/privacy` and `/terms` — confirm `NotchNav` renders and the wordmark link points at `/rovyk`.
- Load `/` — confirm the stub renders with no console errors.
- Check `console --errors` / `page.on("pageerror")` across all four loads.

Kill the dev server after.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor(routing): move the current site to /rovyk, add the (site) route group"
```

---

## Task 3: Landing nav

**Files:**
- Create: `components/landing/landing-notch-nav.tsx`
- Modify: `app/page.tsx`
- Test: manual — hover/focus/touch behavior smoke check

**Interfaces:**
- Consumes: `Fillet`, `NotchBezel` from `components/notch-fillet.tsx`; `RovykWordmark` from `components/rovyk-wordmark.tsx`; `EASE`, `EDGE_BLEED`, `EDGE_LIGHT`, `LETTER_STEP_MS`, `MARK_H_OPEN`, `MARK_H_SHUT`, `MARK_W_OPEN`, `MARK_W_SHUT`, `NOTCH_H` from `lib/notch.ts`; `cn` from `lib/utils.ts`.
- Produces: `LandingNotchNav()` — a component with no props, default-exported... (named export, matching the rest of the codebase's convention) `export function LandingNotchNav()`.

- [ ] **Step 1: Create `components/landing/landing-notch-nav.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { RovykWordmark } from "@/components/rovyk-wordmark";
import { Fillet, NotchBezel } from "@/components/notch-fillet";
import {
  EASE,
  EDGE_BLEED,
  EDGE_LIGHT,
  LETTER_STEP_MS,
  MARK_H_OPEN,
  MARK_H_SHUT,
  MARK_W_OPEN,
  MARK_W_SHUT,
  NOTCH_H,
} from "@/lib/notch";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The landing page's own nav — the same notch shape `NotchNav` hangs off
   the bezel with, but with no links to reveal, on any device.

   Where `NotchNav` opens a rail of links on hover and a whole different
   touch drawer, this has nothing to put in either, so it is not two
   navs branching on pointer capability — it is one nav whose *wordmark*
   either opens on hover (pointer devices, same motion as `NotchNav`) or
   just sits open from the start (touch, which has no hover to ever
   trigger a reveal). No links means no `home`/anchor logic either.
   ──────────────────────────────────────────────────────────────────── */

const CLOSE_DELAY_MS = 120;
const REVEAL_DELAY_MS = 900;
const PARKED_Y = `calc(-1 * (var(--gut) + ${NOTCH_H}px))`;
const POINTER = "(hover: hover) and (pointer: fine)";

export function LandingNotchNav() {
  const [shown, setShown] = useState(false);
  const [pointerCapable, setPointerCapable] = useState(false);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Same entrance as `NotchNav`: drops in once, shortly after mount. */
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setShown(true), still ? 0 : REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  /* Watched rather than read once — same reasoning as `NotchNav`: a
     Surface folded into a tablet, or a phone with a mouse plugged into
     it, can change answer mid-session. */
  useEffect(() => {
    const mq = matchMedia(POINTER);
    const read = () => setPointerCapable(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  useEffect(
    () => () => void (closeTimer.current && clearTimeout(closeTimer.current)),
    [],
  );

  /* Touch never fires hover, so it would otherwise never see past the
     shut "R" — it sits expanded unconditionally instead. */
  const expanded = open || !pointerCapable;

  const hold = () => {
    if (!pointerCapable) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const release = () => {
    if (!pointerCapable) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  return (
    <>
      <NotchBezel />

      <nav
        aria-label="Main"
        onMouseEnter={hold}
        onMouseLeave={release}
        onFocusCapture={hold}
        onBlurCapture={release}
        className={cn(
          "fixed top-(--gut) left-1/2 z-100 flex items-start text-black",
          "pb-4",
          "transition-transform duration-550 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
          shown ? "pointer-events-auto" : "pointer-events-none",
        )}
        style={{ transform: `translate(-50%, ${shown ? "0px" : PARKED_Y})` }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-px right-full h-px w-[20vw]"
          style={{
            background: `linear-gradient(270deg, rgba(255,255,255,${EDGE_BLEED}), transparent)`,
          }}
        />

        <Fillet side="l" />

        <div
          className="relative flex items-center bg-black px-5.5 pb-3"
          style={{ height: NOTCH_H }}
        >
          <Link
            href="/"
            aria-label="Rovyk"
            className="flex shrink-0 items-center px-0.5 text-white transition-opacity duration-200 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* Fixed at the taller of the two states (shut, 22px) so the
                mark never nudges the notch's vertical centre — only its
                width and the inner SVG's own height travel. */}
            <div
              className="flex items-center overflow-hidden"
              style={{
                height: MARK_H_SHUT,
                width: expanded ? MARK_W_OPEN : MARK_W_SHUT,
                transition: `width .55s ${EASE}`,
              }}
            >
              <RovykWordmark
                className={cn(
                  "shrink-0 [&_path]:transition-opacity [&_path]:duration-300",
                  expanded
                    ? "[&_path]:opacity-100 [&_path]:delay-[calc(var(--letter-index)*var(--letter-step))]"
                    : "[&_path]:delay-0 [&_path:not(:first-child)]:opacity-0",
                  "motion-reduce:[&_path]:transition-none",
                )}
                style={
                  {
                    height: expanded ? MARK_H_OPEN : MARK_H_SHUT,
                    transition: `height .55s ${EASE}`,
                    "--letter-step": `${LETTER_STEP_MS}ms`,
                  } as CSSProperties
                }
              />
            </div>
          </Link>

          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
            style={{ background: `rgba(255,255,255,${EDGE_LIGHT})` }}
          />
        </div>

        <Fillet side="r" />

        <span
          aria-hidden
          className="pointer-events-none absolute -top-px left-full h-px w-[20vw]"
          style={{
            background: `linear-gradient(90deg, rgba(255,255,255,${EDGE_BLEED}), transparent)`,
          }}
        />
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

Replace the stub's body:

```tsx
export default function Page() {
  return (
    <main className="grid min-h-svh place-items-center bg-background text-white">
      <p className="text-sm text-white/40">Landing page under construction.</p>
    </main>
  );
}
```

with:

```tsx
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <main className="relative m-(--gut) rounded-4xl bg-background pt-32">
        <p className="text-center text-sm text-white/40">
          Landing page under construction.
        </p>
      </main>
    </>
  );
}
```

(`pt-32` is a placeholder gap so the stub text doesn't sit under the notch — Task 4 replaces it with the real hero, which carries its own top spacing.)

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/landing/landing-notch-nav.tsx app/page.tsx`
Expected: no output from either.

- [ ] **Step 4: Behavior smoke check**

With the dev server running, headless-browser check on `/`:
- Desktop viewport, `--autoplay-policy` irrelevant here: hover the nav — wordmark should widen from "R" to the full "ROVYK" mark, no link rail appears anywhere.
- Emulate a touch device (Playwright `hasTouch: true`, or set the viewport with `isMobile: true`) and reload — wordmark should render already expanded, with no hover needed.
- Confirm `console --errors` is empty.

- [ ] **Step 5: Commit**

```bash
git add components/landing/landing-notch-nav.tsx app/page.tsx
git commit -m "feat(landing): add the landing page's notch nav"
```

---

## Task 4: Landing hero

**Files:**
- Create: `components/landing/landing-hero.tsx`
- Modify: `app/page.tsx`
- Test: manual — visual smoke check

**Interfaces:**
- Produces: `LandingHero()` — no props.

- [ ] **Step 1: Create `components/landing/landing-hero.tsx`**

```tsx
/**
 * The landing page's opening beat: the product's name, said once more
 * than the nav already said it, then room to breathe before the video
 * — the video is the page's actual argument, this is just the title
 * card in front of it.
 */
export function LandingHero() {
  return (
    <div className="flex flex-col items-center px-6 pt-[clamp(96px,14vh,168px)] pb-[clamp(48px,7vh,88px)] text-center sm:px-10">
      <h1 className="text-[clamp(34px,5vw,58px)] leading-[1.05] font-medium tracking-[-0.035em]">
        Rovyk for macOS
      </h1>
      <p className="mt-4 max-w-[46ch] text-[clamp(15px,1.2vw,17px)] leading-[1.6] font-light tracking-[-0.004em] text-muted-foreground">
        Talk to your Mac. Watch it work.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

```tsx
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <main className="relative m-(--gut) rounded-4xl bg-background">
        <LandingHero />
        <p className="pb-24 text-center text-sm text-white/40">
          Landing page under construction.
        </p>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/landing/landing-hero.tsx app/page.tsx`
Expected: no output from either.

- [ ] **Step 4: Visual smoke check**

Screenshot `/` with a headless browser — confirm the title and supporting line render centred, below the nav, with no overlap.

- [ ] **Step 5: Commit**

```bash
git add components/landing/landing-hero.tsx app/page.tsx
git commit -m "feat(landing): add the landing page's hero"
```

---

## Task 5: Landing video (placeholder)

**Files:**
- Create: `components/landing/landing-video.tsx`
- Modify: `app/page.tsx`
- Test: manual — visual smoke check

**Interfaces:**
- Produces: `LandingVideo()` — no props.

- [ ] **Step 1: Create `components/landing/landing-video.tsx`**

```tsx
import Image from "next/image";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr";
import heroWall from "@/public/assets/hero-wall.jpg";

/**
 * The page's dominant element, and for now a placeholder: a poster frame
 * with no `<video>` behind it yet. Reuses the hero wallpaper rather than
 * a blank box, so the slot reads as "a video is meant to be here" rather
 * than "something is missing." Swapping in a real file later — a
 * `<video src>` with this same poster — is a contained change to this
 * one component; nothing outside it needs to know the difference.
 */
export function LandingVideo() {
  return (
    <div className="flex justify-center px-6 sm:px-10">
      <div
        className="relative aspect-16/9 w-full overflow-hidden rounded-3xl bg-background shadow-[0_0_0_1px_rgba(255,255,255,.18),0_0_0_6px_rgba(255,255,255,.035),0_40px_90px_-30px_rgba(0,0,0,.9)]"
        style={{ maxWidth: "min(1100px, 78vw)" }}
      >
        <Image
          src={heroWall}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1100px) 1100px, 78vw"
          placeholder="blur"
          className="object-cover object-[center_42%]"
        />
        <div className="absolute inset-0 bg-black/38" />

        {/* Decorative, not a control — there is nothing to play yet. A
            non-functional button would be a worse affordance than none. */}
        <div
          aria-hidden
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid size-16 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur-sm sm:size-20">
            <PlayIcon
              weight="fill"
              className="size-6 translate-x-0.5 text-white/85 sm:size-7"
            />
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

```tsx
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";
import { LandingVideo } from "@/components/landing/landing-video";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <main className="relative m-(--gut) rounded-4xl bg-background">
        <LandingHero />
        <LandingVideo />
        <p className="pt-10 pb-24 text-center text-sm text-white/40">
          Landing page under construction.
        </p>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/landing/landing-video.tsx app/page.tsx`
Expected: no output from either.

- [ ] **Step 4: Visual smoke check**

Screenshot `/` — confirm the video frame renders centred, roughly 78% of viewport width (capped at 1100px), 16:9, rounded with a visible shadow, poster image showing, play glyph centred.

- [ ] **Step 5: Commit**

```bash
git add components/landing/landing-video.tsx app/page.tsx
git commit -m "feat(landing): add the landing page's video placeholder"
```

---

## Task 6: Landing action row

**Files:**
- Create: `components/landing/landing-action.tsx`
- Modify: `app/page.tsx`
- Test: manual — visual smoke check + `WAITLIST_MODE` behavior check

**Interfaces:**
- Consumes: `DownloadButton`, `GhostButton` from `components/cta-button.tsx`.
- Produces: `LandingAction()` — no props.

- [ ] **Step 1: Create `components/landing/landing-action.tsx`**

```tsx
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
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

```tsx
import { LandingAction } from "@/components/landing/landing-action";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";
import { LandingVideo } from "@/components/landing/landing-video";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <main className="relative m-(--gut) rounded-4xl bg-background">
        <LandingHero />
        <LandingVideo />
        <LandingAction />
        <p className="pb-24 text-center text-sm text-white/40">
          Landing page under construction.
        </p>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/landing/landing-action.tsx app/page.tsx`
Expected: no output from either.

- [ ] **Step 4: Visual and behavior smoke check**

Screenshot `/` — confirm Download + "Learn more" sit centred right under the video, with the compatibility row beneath. Click "Learn more" — confirm it navigates to `/rovyk`. Check the built HTML for whether `WAITLIST_MODE` is on (`grep NEXT_PUBLIC_WAITLIST_MODE .env* 2>/dev/null` or check the rendered button label) — if on, confirm the Download button opens the waitlist dialog rather than navigating; if off, confirm it's a plain link.

- [ ] **Step 5: Commit**

```bash
git add components/landing/landing-action.tsx app/page.tsx
git commit -m "feat(landing): add the landing page's download/learn-more/compat row"
```

---

## Task 7: Landing feature cards

**Files:**
- Create: `components/landing/landing-features.tsx`
- Modify: `app/page.tsx`
- Test: manual — visual smoke check

**Interfaces:**
- Produces: `LandingFeatures()` — no props.

- [ ] **Step 1: Create `components/landing/landing-features.tsx`**

```tsx
import {
  CpuIcon,
  GridFourIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";

const FEATURES = [
  {
    icon: CpuIcon,
    title: "On-device by default",
    body: "Hearing and reasoning run locally. Nothing leaves your Mac unless you choose otherwise.",
  },
  {
    icon: GridFourIcon,
    title: "Sixty-one tools, one loop",
    body: "Reads mail, drives apps, browses the web, moves files — and picks the right tool itself.",
  },
  {
    icon: ShieldCheckIcon,
    title: "A gate before anything irreversible",
    body: "Sending, moving, deleting: confirmed before it runs, not after.",
  },
] as const;

/** Three equal columns, thin dividers between them on desktop. */
export function LandingFeatures() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-[clamp(56px,8vh,104px)] sm:px-10">
      <div className="grid gap-10 border-t border-border pt-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:pt-0">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col items-center px-0 text-center sm:px-8 sm:first:pl-0 sm:last:pr-0"
          >
            <Icon
              weight="thin"
              className="size-7 text-white/70"
              aria-hidden
            />
            <h3 className="mt-4 text-[15.5px] font-medium tracking-[-0.01em]">
              {title}
            </h3>
            <p className="mt-2 max-w-[30ch] text-[13.5px] leading-[1.55] font-light text-white/58">
              {body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

```tsx
import { LandingAction } from "@/components/landing/landing-action";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";
import { LandingVideo } from "@/components/landing/landing-video";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <main className="relative m-(--gut) rounded-4xl bg-background">
        <LandingHero />
        <LandingVideo />
        <LandingAction />
        <LandingFeatures />
        <p className="pb-24 text-center text-sm text-white/40">
          Landing page under construction.
        </p>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/landing/landing-features.tsx app/page.tsx`
Expected: no output from either.

- [ ] **Step 4: Visual smoke check**

Screenshot `/` at desktop and mobile widths — confirm three columns with dividers at `sm:` and up, stacked with a top hairline below that.

- [ ] **Step 5: Commit**

```bash
git add components/landing/landing-features.tsx app/page.tsx
git commit -m "feat(landing): add the landing page's feature cards"
```

---

## Task 8: Landing footer, final page composition, and metadata

**Files:**
- Create: `components/landing/landing-footer.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Create: `app/opengraph-image.tsx`
- Test: manual — full-page visual smoke check

**Interfaces:**
- Consumes: `RovykWordmark` from `components/rovyk-wordmark.tsx`.
- Produces: `LandingFooter()` — no props. Final `app/page.tsx` composition.

- [ ] **Step 1: Create `components/landing/landing-footer.tsx`**

```tsx
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
```

- [ ] **Step 2: Finalize `app/page.tsx`**

```tsx
import { LandingAction } from "@/components/landing/landing-action";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";
import { LandingVideo } from "@/components/landing/landing-video";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <div className="relative m-(--gut) rounded-4xl bg-background">
        <main>
          <LandingHero />
          <LandingVideo />
          <LandingAction />
          <LandingFeatures />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Finalize root layout metadata**

In `app/layout.tsx`, replace the placeholder `metadata` from Task 2 Step 4 with the real landing copy:

```tsx
export const metadata: Metadata = {
  metadataBase: SITE_ORIGIN,
  alternates: { canonical: "/" },
  title: "Rovyk for macOS",
  description:
    "Rovyk for macOS. Talk to your Mac and watch it work — see it in action, then download.",
};
```

- [ ] **Step 4: Add the landing page's own OG image**

Create `app/opengraph-image.tsx`:

```tsx
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/components/og/render";

export const alt = "Rovyk for macOS";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage("Rovyk for macOS.");
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/landing/landing-footer.tsx app/page.tsx app/layout.tsx app/opengraph-image.tsx`
Expected: no output from either.

- [ ] **Step 6: Full build**

Run: `npm run build`
Expected: succeeds; route output lists `/`, `/rovyk`, `/privacy`, `/terms`, and OG image routes for each.

- [ ] **Step 7: Full-page visual smoke check**

Screenshot the whole `/` page (nav → hero → video → action → features → footer) at desktop and mobile widths. Confirm `/privacy` and `/terms` footer links resolve. Confirm no console errors anywhere.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(landing): add the footer, finalize composition and metadata"
```

---

## Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors. (Pre-existing warnings unrelated to this feature — e.g. unused exports in files this plan never touches — are not this feature's concern; only touched files must be clean.)

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: succeeds, no warnings about the new routes.

- [ ] **Step 3: `sitemap.xml` check**

Run: `npm run dev` in the background, wait for it to serve, then `curl -s http://localhost:3000/sitemap.xml` — confirm it lists `/`, `/rovyk`, `/privacy`, `/terms`.

- [ ] **Step 4: Cross-route headless-browser pass**

With the dev server running:
- `/` — nav (hover-expand on pointer, expanded on touch emulation), hero, video placeholder, Download + Learn more (→ `/rovyk`), three feature cards, footer (→ `/privacy`, `/terms`). No console errors.
- `/rovyk` — identical to the pre-restructure homepage: intro performance, hero, every section, `NotchNav` (wordmark → `/rovyk`), `SiteFooter`. No console errors.
- `/privacy`, `/terms` — `NotchNav` present, wordmark → `/rovyk`, content unchanged. No console errors.

- [ ] **Step 5: Clean up any ad hoc verification scripts**

Remove any scratch Playwright scripts created for this plan's smoke checks (this repo's convention — see prior session history — is not to leave `.scratch-*` files committed). Revert `package-lock.json` if a throwaway `npm install --no-save playwright` touched it: `git checkout -- package-lock.json && rm -rf node_modules && npm ci`.

- [ ] **Step 6: Final commit (if Step 5 produced any changes)**

```bash
git add -A
git status --short   # confirm only intended files remain
```

If clean, no commit needed — the feature is done.
