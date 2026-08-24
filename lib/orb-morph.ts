import { finalizeFrame, type Dot, type OrbFrame } from "thinking-orbs/engine";

/* ────────────────────────────────────────────────────────────────────
   Morphing one orb geometry into another.

   The library hands back geometry separately from painting — a frame is
   a finished list of dots, and `paintFrame` will draw whatever list you
   give it. So a state change does not have to be a dissolve between two
   canvases: the dots themselves can travel.

   The obstacle is that no two modes agree on how many dots they use —
   134 for the wave, 566 for the ribbon — so there is nothing to pair
   one-to-one. Both sides are resampled to the larger count, which means
   the smaller side repeats some dots. Those repeats are the trick: at
   their own end of the morph they sit exactly on top of each other and
   read as a single dot, and travelling to the other end they fan out to
   distinct targets. One dot splits into three rather than three dots
   fading up out of nowhere.

   Pairing is by angle around the centre, so a dot's journey is the short
   way round instead of across the sphere. Sorting is decorated — atan2
   is far too expensive to call from inside a comparator sixty times a
   second.
   ──────────────────────────────────────────────────────────────────── */

/** Sorted copy, by angle about the frame's centre. */
function byAngle(dots: Dot[], centre: number): Dot[] {
  const n = dots.length;
  const key = new Float64Array(n);
  const order = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    key[i] = Math.atan2(dots[i].y - centre, dots[i].x - centre);
    order[i] = i;
  }
  const sorted = Array.from(order).sort((a, b) => key[a] - key[b]);
  return sorted.map((i) => dots[i]);
}

/** Stretch a list to `n` entries by repeating, evenly spread. */
function resample(dots: Dot[], n: number): Dot[] {
  if (dots.length === n) return dots;
  const out: Dot[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = dots[((i * dots.length) / n) | 0];
  return out;
}

const mix = (a: number, b: number, f: number) => a + (b - a) * f;

/**
 * Geometry `f` of the way from `a` to `b`. Both are already-finalised
 * frames straight out of `MODE_FRAMES`; the result is re-finalised so the
 * blend is z-sorted into its own draw order rather than either input's.
 */
export function morphFrame(
  a: OrbFrame,
  b: OrbFrame,
  f: number,
  size: number,
): OrbFrame {
  if (f <= 0) return a;
  if (f >= 1) return b;

  const centre = size / 2;
  const n = Math.max(a.dots.length, b.dots.length);
  const from = resample(byAngle(a.dots, centre), n);
  const to = resample(byAngle(b.dots, centre), n);

  const dots: Dot[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = from[i];
    const q = to[i];
    dots[i] = {
      x: mix(p.x, q.x, f),
      y: mix(p.y, q.y, f),
      z: mix(p.z, q.z, f),
      r: mix(p.r, q.r, f),
      white: mix(p.white, q.white, f),
      a: mix(p.a ?? 1, q.a ?? 1, f),
    };
  }

  /* Edges belong to one mode only (the web), so there is nothing to pair
     them with — they simply thin out as their own side loses the blend. */
  const lines = (f < 0.5 ? a.lines : b.lines).map((l) => ({
    ...l,
    a: (l.a ?? 1) * (f < 0.5 ? 1 - f * 2 : f * 2 - 1),
  }));

  // rMin 0: both inputs arrived already clamped by their own mode.
  return finalizeFrame(dots, lines, 0);
}
