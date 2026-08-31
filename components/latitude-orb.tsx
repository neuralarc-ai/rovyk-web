"use client";

import { useEffect, useRef } from "react";
import type { OrbState } from "thinking-orbs/engine";
import CFG from "@/lib/orb-config.json";
import { cn } from "@/lib/utils";

/**
 * The orb as latitude bands.
 *
 * A sphere tilted toward the viewer, sliced into bands of latitude. It
 * replaces the dot-field orb in the orb section only — the hero and the HUD
 * still draw `<HeroOrb>`.
 *
 * The geometry is real rather than stripes on a circle. A latitude circle on a
 * tilted sphere projects to an ellipse, and the half of it facing us ends
 * exactly on the silhouette, which is why the polar cap seals into a closed
 * ellipse and the bottom band thins to a crescent without either being a
 * special case. Bands are separate filled paths with the ground showing
 * between them; nothing is stroked, because a stroke centred on a band edge
 * gets its outer half clipped away at the rim and leaves a notch there.
 *
 * Two kinds of state live here. Three animate *light* over bands that never
 * move — Idle, Listening, Thinking. Three hold the light still, as a fixed
 * vertical field, and animate the *geometry* — Working, Speaking, Resolved. A
 * band in those changes tone only because it has travelled somewhere
 * brighter, which is why they carry no flicker at all.
 *
 * ── Tuning ──────────────────────────────────────────────────────────────
 * Every number that shapes the animation lives in `lib/orb-config.json` and
 * nothing here is a literal. To retune: open `docs/orb-tuner.html` in a
 * browser, drag the sliders, hit Copy JSON, and replace the whole contents of
 * that file with what you copied. The tuner draws with this same maths, so
 * what you see there is what the app renders.
 */

/* ── Config ─────────────────────────────────────────────────────────────── */

const G = CFG.global;

/** The six things the orb can be. The library's `OrbState` is wider than this
 *  and is mapped onto it below. */
type OrbMode = "idle" | "listening" | "thinking" | "working" | "speaking" | "resolved";

/** Which mode each library state draws as. `resolved` has no beat pointing at
 *  it yet — it is wired and waiting for one — so it is reachable only by
 *  passing the mode name directly. */
const MODE_OF: Record<OrbState, OrbMode> = {
  searching: "idle",
  listening: "listening",
  solving: "thinking",
  working: "working",
  composing: "speaking",
  connecting: "idle",
  weaving: "idle",
  breathing: "idle",
  shaping: "idle",
};

const isMode = (v: string): v is OrbMode =>
  v === "idle" || v === "listening" || v === "thinking" ||
  v === "working" || v === "speaking" || v === "resolved";

/* ── Geometry ───────────────────────────────────────────────────────────── */

const VB = 100;
const CX = 50;
const CY = 50;
const RAD = 47;

const TILT = (G.tilt * Math.PI) / 180;
const CT = Math.cos(TILT);
const ST = Math.sin(TILT);

/** Visible bands. */
const N = G.bands;

/**
 * Seams, and therefore paths, are one more than the bands you can see.
 *
 * The extra one rides at the pole as a zero-height sliver, and exists so that
 * every state emits arrays of exactly the same length — which is what lets a
 * state change interpolate the geometry rather than snap it. It also gives the
 * scrolling states somewhere for a new band to enter from and an old one to
 * leave into, so the stack travels without the count ever changing.
 */
const SEAM_N = N;
const PATH_N = N + 1;

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clampS = (v: number) => (v > 1 ? 1 : v < -1 ? -1 : v);
const smoothstep = (u: number) => u * u * (3 - 2 * u);
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

const circleD = () =>
  `M${r3(CX - RAD)} ${r3(CY)}` +
  `A${r3(RAD)} ${r3(RAD)} 0 1 0 ${r3(CX + RAD)} ${r3(CY)}` +
  `A${r3(RAD)} ${r3(RAD)} 0 1 0 ${r3(CX - RAD)} ${r3(CY)}Z`;

const ellipseD = (s: number) => {
  const a = Math.sqrt(Math.max(0, 1 - s * s));
  const rx = a * RAD;
  const ry = a * ST * RAD;
  const cy = CY - s * CT * RAD;
  return (
    `M${r3(CX - rx)} ${r3(cy)}` +
    `A${r3(rx)} ${r3(ry)} 0 1 0 ${r3(CX + rx)} ${r3(cy)}` +
    `A${r3(rx)} ${r3(ry)} 0 1 0 ${r3(CX - rx)} ${r3(cy)}Z`
  );
};

/**
 * The subpaths whose even-odd union is "every visible point below latitude
 * `s`". Expressing a band as the difference of two of these makes the awkward
 * cases free: a cap whose circle lies wholly on the near face comes out as a
 * closed ellipse, a southern latitude hidden behind the bulge comes out as
 * nothing at all, and the band above it simply runs to the rim.
 */
function belowPaths(s: number): string[] {
  if (s >= 0.9999) return [circleD()];

  const a = Math.sqrt(Math.max(0, 1 - s * s));
  if (a < 0.02) return s > 0 ? [circleD()] : [];

  // Where the latitude circle crosses the terminator: below -1 the whole
  // circle faces us, above +1 all of it is round the back.
  const k = -(s / a) * Math.tan(TILT);
  if (k >= 0.999) return [];
  if (k <= -0.999) return [circleD(), ellipseD(s)];

  const rx = a * RAD;
  const ry = a * ST * RAD;
  const ex = a * Math.sqrt(1 - k * k) * RAD;
  const y = CY - (s / CT) * RAD;

  // Left edge to right along the underside of the latitude ellipse, then the
  // long way back under the rim. Both endpoints sit on the silhouette exactly.
  return [
    `M${r3(CX - ex)} ${r3(y)}` +
      `A${r3(rx)} ${r3(ry)} 0 ${k < 0 ? 1 : 0} 0 ${r3(CX + ex)} ${r3(y)}` +
      `A${r3(RAD)} ${r3(RAD)} 0 ${y < CY ? 1 : 0} 1 ${r3(CX - ex)} ${r3(y)}Z`,
  ];
}

/**
 * Seam latitudes and per-seam gaps to one `d` per band, plus each band's
 * centre down the orb.
 *
 * A band whose edges have met emits an empty path rather than being dropped,
 * so the path count never changes and React never has to add or remove a node.
 *
 * The gap is inset in the latitude *angle* — a constant distance across the
 * sphere's surface. Insetting it in sin(latitude) instead eats an enormous
 * slice of surface near the pole and leaves the cap swimming in a ring three
 * times too thick.
 */
function buildBands(seams: number[], gaps: number[]) {
  const S = [1, ...seams, -1];
  const k = 1 / (2 * RAD * CT);
  const ds: string[] = [];
  const ys: number[] = [];

  for (let i = 0; i < S.length - 1; i++) {
    const gT = i === 0 ? 0 : gaps[i - 1] * k;
    const gB = i === S.length - 2 ? 0 : gaps[i] * k;
    const top = i === 0 ? 1 : Math.sin(Math.asin(clampS(S[i])) - gT);
    const bot = i === S.length - 2 ? -1 : Math.sin(Math.asin(clampS(S[i + 1])) + gB);
    // Centre of the band down the orb: 0 at the top, 1 at the bottom.
    ys.push(0.5 - ((top + bot) * CT) / 4);
    ds.push(top - bot < 0.004 ? "" : [...belowPaths(top), ...belowPaths(bot)].join(" "));
  }
  return { ds, ys };
}

/** Band thicknesses in sin(latitude) for the resting layout: a thin cap, a run
 *  of equal middles, a thin crescent. */
function baseThick(): number[] {
  const mids = N - 2;
  const out = [0.05];
  for (let i = 0; i < mids; i++) out.push(1.9 / mids);
  out.push(0.05);
  return out;
}

/** Thicknesses to seams, walking down from the north pole, with the pole-side
 *  sliver prepended so the array is always `SEAM_N` long. */
function seamsOf(thick: number[]): number[] {
  const total = thick.reduce((a, b) => a + b, 0);
  const out = [1];
  let at = 1;
  for (let i = 0; i < thick.length - 1; i++) {
    at -= (thick[i] / total) * 2;
    out.push(at);
  }
  return out;
}

/** Thicknesses with the cap and crescent held, so the poles stay the thin
 *  slivers the design depends on however hard the middle is worked. */
function shaped(f: (i: number, mids: number) => number): number[] {
  const base = baseThick();
  return base.map((b, i) =>
    i === 0 || i === base.length - 1 ? b : b * f(i - 1, base.length - 2),
  );
}

const BASE_SEAMS = seamsOf(baseThick());
const FLAT_GAPS = Array.from({ length: SEAM_N }, () => G.gap);

/* ── Light ──────────────────────────────────────────────────────────────────
   The three painted states. All are continuous in band index and in time:
   quantising either — rounding a crest to a whole band, or stepping it once a
   tick — is what reads as jank, and no easing afterwards can smooth a signal
   that is being resampled too coarsely. */

/** Raised cosine: 1 at the centre, easing to nothing at `w`. */
const rc = (d: number, w: number) => {
  const a = Math.abs(d);
  return a >= w ? 0 : 0.5 * (1 + Math.cos((Math.PI * a) / w));
};

/** Smoothstep between two edges; reverses cleanly when `a > b`. */
const ramp = (x: number, a: number, b: number) =>
  smoothstep(clamp01((x - a) / (b - a)));

/** Band distance the short way round, so a crest leaving the bottom re-enters
 *  at the cap without jumping. */
const ringDist = (i: number, at: number) => {
  const d = Math.abs(i - at);
  return d > N / 2 ? N - d : d;
};

/* ── Shape ──────────────────────────────────────────────────────────────────
   The three built states. The light is a fixed vertical field and what moves
   is where the seams fall and how far the gaps open. */

/** A light field of a given half-width, sitting on its own floor. */
const fieldOf = (w: number, lift: number) => (y: number) =>
  lift + (0.96 - lift) * clamp01(1 - Math.abs(y - 0.5) / w);

/* ── States ─────────────────────────────────────────────────────────────── */

/** One frame of one state: where every seam sits, how wide every gap is, and
 *  how bright every band is. Fixed lengths, so two of these interpolate. */
type Frame = { seams: number[]; gaps: number[]; levels: number[] };

type Sampler = (t: number) => Frame;

/** Painted states share the resting geometry and vary only their levels. The
 *  leading sliver takes the cap's tone so it is never a visible edge. */
function painted(level: (i: number, t: number) => number): Sampler {
  return (t) => {
    const levels = new Array<number>(PATH_N);
    for (let i = 0; i < PATH_N; i++) levels[i] = clamp01(level(Math.max(0, i - 1), t));
    return { seams: BASE_SEAMS, gaps: FLAT_GAPS, levels };
  };
}

/** Built states compute their geometry first, then read the light field at
 *  wherever each band has ended up. */
function built(
  frame: (t: number) => { seams: number[]; gaps: number[] },
  tone: (y: number) => number,
): Sampler {
  return (t) => {
    const { seams, gaps } = frame(t);
    const { ys } = buildBands(seams, gaps);
    return { seams, gaps, levels: ys.map((y) => clamp01(tone(y))) };
  };
}

const SAMPLE: Record<OrbMode, Sampler> = {
  /* Idle — awake, nothing asked of it. Every band at the same low level with a
     ripple drifting down it: alive without claiming to be busy. */
  idle: painted((i, t) => {
    const c = CFG.idle;
    return c.level + c.swing * Math.sin(t * c.rate - i * 0.4);
  }),

  /* Listening — a level meter filling from the bottom, capped short of the cap
     so it can never be mistaken for a fully lit orb. */
  listening: painted((i, t) => {
    const c = CFG.listening;
    const env = 0.5 + 0.5 * Math.sin(t * c.rate) * Math.sin(t * c.slow + 0.8);
    const edge = N - (c.floor + env * (N * c.reach - c.floor));
    return 0.09 + 0.88 * ramp(i, edge - G.feather / 2, edge + G.feather / 2);
  }),

  /* Thinking — one crest gliding top to bottom and re-entering at the cap.
     Between two bands both are lit; that crossfade is the movement. */
  thinking: painted(
    (i, t) => 0.06 + 0.93 * rc(ringDist(i, (t * CFG.thinking.rate) % N), G.feather),
  ),

  /* Working — Drift. The whole stack travels over the surface: bands are born
     at the cap, cross the equator and are swallowed at the bottom. It reads as
     the sphere turning rather than as anything lighting up. */
  working: built(
    (t) => {
      const pitch = 1.9 / Math.max(1, N - 2);
      const phase = (t * CFG.working.rate) % pitch;
      // One seam enters at the pole as another leaves at the far one, so the
      // count holds and the wrap is continuous.
      const seams = Array.from({ length: SEAM_N }, (_, j) =>
        clampS(0.95 - phase + pitch - j * pitch),
      );
      return { seams, gaps: FLAT_GAPS };
    },
    fieldOf(CFG.working.field, 0.14),
  ),

  /* Speaking — Meter. Band heights carry the energy while the light holds
     still, so a band brightens only by growing into a brighter part of the
     orb. A spectrum analyser wrapped onto the sphere. */
  speaking: built(
    (t) => {
      const c = CFG.speaking;
      const seams = seamsOf(
        shaped(
          (i) =>
            1 -
            c.depth * 0.5 +
            c.depth *
              (0.5 + 0.5 * Math.sin(t * c.rate + i * 1.7) * Math.sin(t * c.slow + i * 0.6)),
        ),
      );
      return { seams, gaps: FLAT_GAPS };
    },
    fieldOf(CFG.speaking.field, 0.11),
  ),

  /* Resolved — Chatter. Every gap opens and closes in sequence down the stack,
     like a mechanism cycling, over an orb that stays bright throughout. */
  resolved: built(
    (t) => {
      const c = CFG.resolved;
      const seams = BASE_SEAMS;
      return {
        seams,
        gaps: seams.map(
          (_, j) => 0.7 + c.swing * (0.5 + 0.5 * Math.cos(j * c.phase - t * c.rate)),
        ),
      };
    },
    fieldOf(CFG.resolved.field, 0.6),
  ),
};

/** One frame that reads as the state, for when there is no loop to watch. */
const STILL: Record<OrbMode, number> = {
  idle: 0.4,
  listening: 1.35,
  thinking: 0.95,
  working: 1.4,
  speaking: 1.1,
  resolved: 0.9,
};

/* ── Ink ────────────────────────────────────────────────────────────────────
   Neutral, because the glow behind the orb already carries the phase colour
   and the palette holds one hue to one meaning. The gap ink is darker than the
   section ground so the segments separate crisply against it. */

const GAP_INK = "#070707";
const DARK: [number, number, number] = [31, 31, 33];
const LIT: [number, number, number] = [250, 250, 251];

/** Brightness to a flat grey. `contrast` buys separation between bands at
 *  small sizes, but pays for it out of the middle of the range — which is
 *  where a crest hands its brightness from one band to the next — so it is a
 *  dial rather than a switch. */
function ink(level: number): string {
  const u = clamp01(level);
  const e = u + (smoothstep(u) - u) * G.contrast;
  const c = (i: 0 | 1 | 2) => Math.round(DARK[i] + (LIT[i] - DARK[i]) * e);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

/** How long the orb takes to cross from one state into the next. Matched to
 *  `<HeroOrb>`'s morph so the two orbs on the page change at the same pace. */
const MORPH_MS = 900;

export function LatitudeOrb({
  state,
  size,
  /**
   * Live audio level, 0–1. Currently always 0 — the same seam `<HeroOrb>`
   * leaves for the voice work, so the orb can ride the waveform of the reply
   * rather than looping beside it.
   */
  amplitude = 0,
  paused = false,
  className,
}: {
  state: OrbState | OrbMode;
  size: number;
  amplitude?: number;
  /** Stop the loop outright, for an orb that is mounted but not being shown. */
  paused?: boolean;
  className?: string;
}) {
  const hostRef = useRef<SVGSVGElement>(null);
  const bandsRef = useRef<(SVGPathElement | null)[]>([]);

  const mode: OrbMode = isMode(state) ? state : MODE_OF[state];

  // The loop reads the latest props from here, so a state change never tears
  // it down and restarts it — which would reset the orb's phase.
  const liveRef = useRef({ mode, amplitude });
  useEffect(() => {
    liveRef.current = { mode, amplitude };
  }, [mode, amplitude]);

  const syncRef = useRef<() => void>(() => {});
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const paint = (f: Frame) => {
      const { ds } = buildBands(f.seams, f.gaps);
      for (let i = 0; i < PATH_N; i++) {
        const el = bandsRef.current[i];
        if (!el) continue;
        el.setAttribute("d", ds[i]);
        el.setAttribute("fill", ink(f.levels[i]));
      }
    };

    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion: one frame that reads as the state, and no loop. The
    // effect re-runs on a state change, so the still frame still follows the
    // reader through the section.
    if (reduced) {
      paint(SAMPLE[liveRef.current.mode](STILL[liveRef.current.mode]));
      return;
    }

    let raf = 0;
    let running = false;
    let onScreen = false;
    let last = performance.now();
    // Our own clock, so an amplitude change ramps the speed rather than
    // jumping the phase.
    let clock = 0;

    /* The departure point is the last frame actually painted, not a state
       name: interrupt a change halfway and the bands carry on from where they
       had got to rather than snapping back. It holds still for the length of
       the crossing, which nothing can see — the arrangement coming in is
       moving the whole time. */
    let painted: Frame | null = null;
    let from: Frame | null = null;
    let to = liveRef.current.mode;
    let mix = 1;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const { mode: wanted, amplitude: level } = liveRef.current;
      if (wanted !== to) {
        from = painted;
        to = wanted;
        mix = from ? 0 : 1;
      }
      if (mix < 1) mix = Math.min(1, mix + (dt * 1000) / MORPH_MS);

      clock += dt * G.speed * (1 + level * 0.6);

      const target = SAMPLE[to](clock);
      let out = target;
      if (mix < 1 && from) {
        // Every array is the same length in every state, so the seams
        // themselves travel from one arrangement into the next.
        const f = smoothstep(mix);
        const src = from;
        out = {
          seams: target.seams.map((v, i) => lerp(src.seams[i], v, f)),
          gaps: target.gaps.map((v, i) => lerp(src.gaps[i], v, f)),
          levels: target.levels.map((v, i) => lerp(src.levels[i], v, f)),
        };
      }

      painted = out;
      paint(out);
      raf = requestAnimationFrame(tick);
    };

    /* Three reasons to be idle — off screen, backgrounded tab, or an orb that
       is mounted but not the one being shown — and one place that resolves
       them. An orb nobody can see should not be costing a frame loop. */
    const sync = () => {
      const want =
        onScreen && !pausedRef.current && document.visibilityState !== "hidden";
      if (want === running) return;
      running = want;
      if (want) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
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
    };
    // The still frame is the one thing that does not come from the loop, so it
    // is the one thing that has to be redrawn when the state changes.
  }, [mode]);

  const first = SAMPLE[mode](STILL[mode]);
  const firstBands = buildBands(first.seams, first.gaps);

  return (
    <svg
      ref={hostRef}
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      role="img"
      aria-label="Rovyk"
      className={cn("block", className)}
    >
      {/* The ground the gaps are cut out of. Every band is built from the same
          rim, so this never shows anywhere but between them. */}
      <circle cx={CX} cy={CY} r={RAD} fill={GAP_INK} />
      {Array.from({ length: PATH_N }, (_, i) => (
        <path
          key={i}
          ref={(el) => {
            bandsRef.current[i] = el;
          }}
          d={firstBands.ds[i]}
          fillRule="evenodd"
          fill={ink(first.levels[i])}
          shapeRendering="geometricPrecision"
        />
      ))}
    </svg>
  );
}
