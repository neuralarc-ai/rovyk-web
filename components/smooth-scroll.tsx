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

  return <>{children}</>;
}
