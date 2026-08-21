"use client";

import { useEffect, useRef } from "react";
import { MODE_DRAWS, resolvePreset, type OrbSize, type OrbState } from "thinking-orbs/engine";
import { cn } from "@/lib/utils";

/**
 * The orb at hero scale, with a dissolve between states.
 *
 * `<ThinkingOrb>` ships exactly two tuned sizes — 64 and 20 — and they are
 * described as separate designs rather than a scale factor, so CSS-scaling a
 * 64px canvas up to hero size would stretch a 128px raster (the library caps
 * DPR at 2). Instead we take the same escape hatch the library ports use:
 * `resolvePreset` for the 64px tuning, then hand `MODE_DRAWS` an arbitrary CSS
 * pixel size. Dot radii scale sub-linearly via the preset's own `rsPow`, so a
 * big orb reads as the same design rather than a magnified one.
 *
 * Two canvases are stacked and cross-faded, because a state change is a change
 * of mode — different geometry entirely — and cutting between them is jarring.
 */

/** How long one state takes to dissolve into the next. */
const CROSSFADE_MS = 620;

type Layer = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: OrbState;
  /** Opacity this layer is heading toward: 1 = incoming, 0 = outgoing. */
  target: number;
  opacity: number;
};

/**
 * The library ships two tunings — 64 for avatar scale, 20 for inline scale —
 * and they are separate designs, not a scale factor. Pick by intent: anything
 * small enough to sit in a line of chrome gets the inline tuning.
 */
function presetFor(size: number): OrbSize {
  return size < 40 ? 20 : 64;
}

function paintLayer(layer: Layer, size: number, seconds: number, speedScale: number) {
  const { mode, speed, opts } = resolvePreset(layer.state, presetFor(size));
  const dpr = Math.min(2, (typeof devicePixelRatio !== "undefined" && devicePixelRatio) || 1);

  if (layer.canvas.width !== Math.round(size * dpr)) {
    layer.canvas.width = Math.round(size * dpr);
    layer.canvas.height = Math.round(size * dpr);
  }

  layer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layer.ctx.clearRect(0, 0, size, size);
  layer.ctx.globalAlpha = layer.opacity;
  MODE_DRAWS[mode](layer.ctx, size, seconds * speed * speedScale, true, opts);
  layer.ctx.globalAlpha = 1;
}

export function HeroOrb({
  state,
  size,
  /**
   * Live audio level, 0–1. Currently always 0 — this is the seam the voice
   * work plugs into, so the orb can ride the waveform of the reply instead of
   * looping beside it. See the voice research notes.
   */
  amplitude = 0,
  className,
}: {
  state: OrbState;
  size: number;
  amplitude?: number;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // The rAF loop reads the latest props from here, so a state change never
  // tears down and restarts the loop (which would reset the orb's phase).
  const liveRef = useRef({ state, size, amplitude });
  useEffect(() => {
    liveRef.current = { state, size, amplitude };
  }, [state, size, amplitude]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    const makeLayer = (initial: OrbState, opacity: number): Layer | null => {
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
      host.appendChild(canvas);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      return { canvas, ctx, state: initial, target: opacity, opacity };
    };

    const front = makeLayer(liveRef.current.state, 1);
    const back = makeLayer(liveRef.current.state, 0);
    if (!front || !back) return;

    const layers = [front, back];
    let shown = liveRef.current.state;

    // Reduced motion: one representative frame, no loop, no dissolve.
    if (reduced) {
      paintLayer(front, liveRef.current.size, 0.6, 1);
      return () => layers.forEach((l) => l.canvas.remove());
    }

    let raf = 0;
    let last = performance.now();
    // Our own clock, so a speed change ramps rather than jumping phase.
    let clock = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const { state: wanted, size: px, amplitude: level } = liveRef.current;

      if (wanted !== shown) {
        // Newest state always lands on whichever layer is currently fading out.
        const incoming = layers.reduce((a, b) => (a.opacity <= b.opacity ? a : b));
        const outgoing = incoming === layers[0] ? layers[1] : layers[0];
        incoming.state = wanted;
        incoming.target = 1;
        outgoing.target = 0;
        shown = wanted;
      }

      const step = (dt * 1000) / CROSSFADE_MS;
      // A quiet orb still breathes; a loud one runs up to ~1.6x.
      clock += dt * (1 + level * 0.6);

      for (const layer of layers) {
        layer.opacity =
          layer.target > layer.opacity
            ? Math.min(layer.target, layer.opacity + step)
            : Math.max(layer.target, layer.opacity - step);
        if (layer.opacity > 0.001) paintLayer(layer, px, clock, 1);
        else layer.ctx.clearRect(0, 0, px, px);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      layers.forEach((l) => l.canvas.remove());
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
