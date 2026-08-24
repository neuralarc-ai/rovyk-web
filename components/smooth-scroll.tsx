"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Lenis owns scrolling, so anything wanting to move the page has to ask it
   rather than calling `scrollTo` behind its back — a native jump gets read
   back as user input on the next frame and fights the glide. Kept at module
   scope rather than in context: there is exactly one instance, and the
   callers are event handlers, not renders. */
let instance: Lenis | null = null;

/** The running instance, or `null` under reduced motion, where there is
 *  none and the caller should fall back to native scrolling. */
export const getLenis = () => instance;

/**
 * Global smooth scroll, with Lenis and GSAP sharing one clock.
 *
 * Lenis' own rAF is off and it is driven from `gsap.ticker` instead. Two
 * independent loops would resolve scroll position and ScrollTrigger's read of
 * it on different frames, which shows up as pinned elements lagging behind
 * the content.
 *
 * Instantiated directly rather than through `<ReactLenis>`: that component
 * keeps its instance in React state and exposes it via `useImperativeHandle`,
 * so a parent's mount effect reads `ref.current.lenis` as `undefined` and
 * would silently skip wiring the ticker — leaving `autoRaf: false` with
 * nothing driving it, and the page unable to scroll at all.
 *
 * Requires `lenis/dist/lenis.css` (imported in globals.css). Next 16 no longer
 * overrides `scroll-behavior` during navigation unless the root element sets
 * `data-scroll-behavior="smooth"` — we deliberately do not, since Lenis owns
 * scrolling here.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Honour the OS setting: no interpolation, just native scrolling.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: false,
      // Long, low-friction glide — the page should feel heavy, not springy.
      lerp: 0.09,
      wheelMultiplier: 0.9,
      // Touch devices already interpolate; overriding fights the platform.
      syncTouch: false,
    });

    // gsap.ticker is in seconds, lenis.raf expects milliseconds.
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    // Without this, a long frame makes gsap "catch up" and Lenis jumps.
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);
    instance = lenis;

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
      instance = null;
    };
  }, []);

  /* Every in-page link on this site is a fragment — the notch nav, the hero's
     two buttons, the footer's index — and the browser answers all of them by
     teleporting. On a page whose sections are built to arrive as you reach
     them, that lands you mid-animation with no idea which way you travelled.

     One delegated listener rather than a handler per link: they are ordinary
     anchors in a dozen components, and the ones that matter most are inside
     `<GhostButton>` and `<DownloadButton>`, which have no business knowing how
     this page scrolls.

     Deliberately does not use Lenis' own `anchors` option. That one never
     calls `preventDefault`, so the browser still performs its jump and Lenis
     glides from wherever it landed — and it offers no way to skip the `#`
     placeholders this page is still full of. */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Leave modified clicks alone: they are "open in a new tab", not "go
      // there". A non-primary button is not a navigation at all.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;

      const target = event.target;
      const link = target instanceof Element ? target.closest("a") : null;
      const href = link?.getAttribute("href");

      /* Only same-page fragments. A bare `#` is a placeholder for a page that
         does not exist yet and should stay inert rather than gliding to the
         top, and `/#how` — how the notch nav links home from the legal pages
         — is a route change the router owns. */
      if (!href?.startsWith("#") || href === "#") return;

      const section = document.getElementById(
        decodeURIComponent(href.slice(1)),
      );
      const lenis = getLenis();
      // No instance means reduced motion, where an instant jump is the
      // correct answer and the browser already gives it.
      if (!section || !lenis) return;

      event.preventDefault();
      /* Clear of the bezel strip, which is fixed over the top `--gut` of the
         viewport — read rather than hard-coded, so the two cannot drift. */
      const gut =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--gut"),
        ) || 0;
      lenis.scrollTo(section, { offset: -gut, duration: 1.1 });

      /* The address bar still has to move, or the section is unlinkable and
         Back does not undo the jump. `pushState` is router-integrated in the
         App Router, so this stays in step with `usePathname`. */
      history.pushState(null, "", href);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <>{children}</>;
}
