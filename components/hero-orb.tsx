"use client";

import { useEffect, useRef } from "react";
import {
  MODE_FRAMES,
  paintFrame,
  resolvePreset,
  type OrbFrame,
  type OrbSize,
  type OrbState,
  type Resolved,
} from "thinking-orbs/engine";
import { morphFrame } from "@/lib/orb-morph";
import { cn } from "@/lib/utils";

/**
 * The orb at hero scale, morphing between states.
 *
 * `<ThinkingOrb>` ships exactly two tuned sizes — 64 and 20 — and they are
 * described as separate designs rather than a scale factor, so CSS-scaling a
 * 64px canvas up to hero size would stretch a 128px raster (the library caps
 * DPR at 2). Instead we take the same escape hatch the library ports use:
 * `resolvePreset` for the tuning, then hand the geometry an arbitrary CSS
 * pixel size. Dot radii scale sub-linearly via the preset's own `rsPow`, so a
 * big orb reads as the same design rather than a magnified one.
 *
 * A state change is a change of mode — different geometry entirely — and this
 * used to cross-fade two stacked canvases through each other. It does not any
 * more: the library separates geometry from painting, so the dots themselves
 * travel from one arrangement into the next and the orb is never two ghosts
 * at half opacity. One canvas, one frame, always solid. See `lib/orb-morph`.
 */

/** How long the dots take to travel from one arrangement to the next.
 *  Longer than the cross-fade it replaced: a dissolve only has to get out of
 *  its own way, whereas a dot going somewhere should be seen going there. */
const MORPH_MS = 820;

/**
 * The library ships two tunings — 64 for avatar scale, 20 for inline scale —
 * and they are separate designs, not a scale factor. Pick by intent: anything
 * small enough to sit in a line of chrome gets the inline tuning.
 */
const presetFor = (size: number): OrbSize => (size < 40 ? 20 : 64);

/** Resolving is pure and the pairs are few, so it is worth not redoing it
 *  sixty times a second. */
const presets = new Map<string, Resolved>();
function preset(state: OrbState, size: number): Resolved {
  const tuning = presetFor(size);
  const key = `${state}:${tuning}`;
  let hit = presets.get(key);
  if (!hit) presets.set(key, (hit = resolvePreset(state, tuning)));
  return hit;
}

/** Geometry for one state at one instant, on its own preset's clock. */
function frameOf(state: OrbState, size: number, clock: number): OrbFrame {
  const { mode, speed, opts } = preset(state, size);
  return MODE_FRAMES[mode](size, clock * speed, opts);
}

/** Ease the travel — a linear morph reads as a machine sliding parts about. */
const smooth = (f: number) => f * f * (3 - 2 * f);

export function HeroOrb({
  state,
  size,
  /**
   * Live audio level, 0–1. Currently always 0 — this is the seam the voice
   * work plugs into, so the orb can ride the waveform of the reply instead of
   * looping beside it. See the voice research notes.
   */
  amplitude = 0,
  paused = false,
  className,
}: {
  state: OrbState;
  size: number;
  amplitude?: number;
  /**
   * Stop the loop outright. The HUD stacks one orb per view and only ever
   * shows one, so the other three would otherwise burn a frame loop each
   * painting into a container at opacity zero.
   */
  paused?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // The rAF loop reads the latest props from here, so a state change never
  // tears down and restarts the loop (which would reset the orb's phase).
  const liveRef = useRef({ state, size, amplitude });
  useEffect(() => {
    liveRef.current = { state, size, amplitude };
  }, [state, size, amplitude]);

  /* The running loop reads this rather than being torn down and rebuilt,
     which would reset the orb's phase every time a view changes. */
  const syncRef = useRef<() => void>(() => {});
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(
      2,
      (typeof devicePixelRatio !== "undefined" && devicePixelRatio) || 1,
    );
    const render = (frame: OrbFrame, px: number) => {
      const raster = Math.round(px * dpr);
      if (canvas.width !== raster) {
        canvas.width = raster;
        canvas.height = raster;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, px, px);
      paintFrame(ctx, frame, true);
    };

    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion: one representative frame, no loop, no travel.
    if (reduced) {
      const { state: s, size: px } = liveRef.current;
      render(frameOf(s, px, 0.6), px);
      return () => canvas.remove();
    }

    let raf = 0;
    let running = false;
    let onScreen = false;
    let last = performance.now();
    // Our own clock, so a speed change ramps rather than jumping phase.
    let clock = 0;
    /* The departure point is the last frame actually painted, not a state
       name: interrupt a morph a third of the way through and the dots carry
       on from where they had got to, rather than snapping to whichever
       arrangement they were originally heading for. It is frozen for the
       length of the morph, which nothing can see — every dot is in motion
       anyway. */
    let painted: { frame: OrbFrame; size: number } | null = null;
    let source: OrbFrame | null = null;
    let to = liveRef.current.state;
    let mix = 1;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const { state: wanted, size: px, amplitude: level } = liveRef.current;
      if (wanted !== to) {
        // A frame measured at another size has its centre in the wrong
        // place, so there is nothing there worth morphing from.
        source = painted && painted.size === px ? painted.frame : null;
        to = wanted;
        mix = source ? 0 : 1;
      }
      if (mix < 1) mix = Math.min(1, mix + (dt * 1000) / MORPH_MS);

      // A quiet orb still breathes; a loud one runs up to ~1.6x.
      clock += dt * (1 + level * 0.6);

      const target = frameOf(to, px, clock);
      const out =
        mix >= 1 || !source
          ? target
          : morphFrame(source, target, smooth(mix), px);
      painted = { frame: out, size: px };
      render(out, px);

      raf = requestAnimationFrame(frame);
    };

    /* Three reasons to be idle — off screen, backgrounded tab, or a view
       that is not the one being shown — and one place that resolves them.
       An orb nobody can see should not be costing a frame loop. */
    const sync = () => {
      const want =
        onScreen && !pausedRef.current && document.visibilityState !== "hidden";
      if (want === running) return;
      running = want;
      if (want) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };
    syncRef.current = sync;

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(host);
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label="Rovyk"
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    />
  );
}
