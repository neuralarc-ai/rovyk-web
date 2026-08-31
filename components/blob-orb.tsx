"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DotRender } from "@/lib/bloub/decor";
import { BotEngine, type BotFrame } from "@/lib/bloub/engine";
import { EXPRESSION_BY_ID } from "@/lib/bloub/expressions";
import { DEMI_VIEWBOX, RAYON } from "@/lib/bloub/repere";
import { SHAPE_BY_ID } from "@/lib/bloub/skins";
import type { StateId } from "@/lib/bloub/states";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The blob, at section scale.

   A React render layer over the vendored bloub engine — see
   `lib/bloub/README.md` for where that came from and why it is a
   temporary stand-in for `<HeroOrb>`.

   The engine is a pure function of time: `sample(t)` returns a whole
   frame — one body path, two eye paths, some dots, some arcs — and
   morphs between states internally, so there is no equivalent of
   `lib/orb-morph` here and nothing to cross-fade.

   Upstream draws this ink-on-paper, black on a light ground; here it is
   the other way up, a white body on the sheet, with the eyes as real
   holes punched through it. On top of that the edge carries a light that
   runs cool on one side and warm on the other — blooming outwards into
   the ground and feathering inwards across the first few pixels of the
   body — and the body itself carries a grain. The engine is untouched by
   any of it: it hands over the same geometry whatever gets painted, and
   every one of these decisions lives below.

   Everything else — when the loop is allowed to run, what reduced
   motion gets — is lifted from `components/hero-orb.tsx` on purpose.
   Two orbs on one page that idle by different rules would be two bugs
   waiting to diverge.
   ──────────────────────────────────────────────────────────────────── */

/**
 * The rim, west to east.
 *
 * These two are not from the page's palette, and deliberately: the four
 * brand hues each carry one meaning and cannot be borrowed, so an ambient
 * treatment that ran indigo would be claiming the agent is thinking on
 * every beat. The rim says nothing; the glow behind the orb, which is
 * `OrbStage`'s job and does come from the palette, is what marks the state.
 */
const RIM_FROM = "#0ad4c6";
const RIM_TO = "#ff8a24";

/** The body. */
const INK = "#ffffff";

/**
 * What shows through the eyes.
 *
 * Not decoration: an opaque body-shaped plate goes down in this colour
 * *underneath* the body, because the eyes are real holes and a hole would
 * otherwise reveal the back halves of the orbit rings drawn behind. So it has
 * to be the ground the orb sits on — `--background` in `app/globals.css`.
 */
const PAPER = "#0b0b0b";

/**
 * The texture, as a tile.
 *
 * The page already has a grain recipe in `app/globals.css` (`bg-grain`) and
 * this is the same turbulence at the same frequency, desaturated — grey
 * speckle, because `feTurbulence` emits colour noise and coloured specks on a
 * white body read as a broken screen. It is multiplied rather than overlaid:
 * the page's grain is overlay precisely so it stays invisible on true black,
 * and the body here is the opposite of that.
 */
const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23g)'/%3E%3C/svg%3E";

/** Resting shape and expression, resolved once — the maps are module-level
 *  constants and the lookup is the same every time. */
const SHAPE = SHAPE_BY_ID.get("cercle")?.radii ?? null;
const EXPRESSION = EXPRESSION_BY_ID.get("neutre") ?? null;

/**
 * Where a still is taken from: one second into the state.
 *
 * Serves both the server's first paint and reduced motion, and they have to
 * agree or the first frame flickers. A second in is far enough that the
 * entry morph has finished and the state is recognisably itself — bloub's
 * own customiser thumbnails freeze at the same mark.
 */
const STILL = 1;

const reducedMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One piece of the orb's substance, in the shape the engine gave it.
 *
 * The body and the dots are the same material and get painted the same way —
 * in `thinking` the ball literally becomes the middle dot, so a dot that read
 * differently from the body would break the one morph the state is built on.
 * Reducing both to this lets each pass over them below say only what it is
 * doing, rather than repeating the difference between a path and a circle
 * five times.
 */
type Solid = {
  key: string;
  opacity?: number;
  d?: string;
  transform?: string;
  cx?: number;
  cy?: number;
  r?: number;
};

/** A dot is a plain disc unless the state hands over a shape — the tilted dot
 *  of the `!` is a teardrop. When it does, the path is in ball-radius units and
 *  centred on the origin, so it gets placed rather than sized. */
const dotSolid = (dot: DotRender, i: number): Solid =>
  dot.d
    ? {
        key: `d${i}`,
        opacity: dot.opacity,
        d: dot.d,
        transform: `translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${RAYON})`,
      }
    : { key: `d${i}`, opacity: dot.opacity, cx: dot.x, cy: dot.y, r: dot.r };

/** One pass over the solids. Whatever presentation it is handed is what that
 *  pass is for — a fill, a stroke, a blurred stroke. */
function Paint({
  solids,
  ...presentation
}: { solids: Solid[] } & React.SVGProps<SVGPathElement & SVGCircleElement>) {
  return solids.map(({ key, ...shape }) =>
    shape.d ? (
      <path key={key} {...presentation} {...shape} />
    ) : (
      <circle key={key} {...presentation} {...shape} />
    ),
  );
}

export function BlobOrb({
  state,
  size,
  replay,
  paused = false,
  rimFrom = RIM_FROM,
  rimTo = RIM_TO,
  ink = INK,
  paper = PAPER,
  className,
}: {
  state: StateId;
  size: number;
  /**
   * Seconds of local time after which the state starts over.
   *
   * Bloub's states were measured off a reference video where each one is
   * held for a couple of seconds and then handed on. Most of them cope with
   * being held longer — `thinking` pulses on a loop, `orbit` keeps spinning,
   * and anything with visible eyes goes on breathing and blinking whatever
   * else it is doing. The ones that *finish* do not: their animation runs to
   * the end and settles into a plain ball. Those need a period; the rest
   * should be left alone, since a restart is a hard cut with no morph.
   */
  replay?: number;
  /** Stop the loop outright, for an orb that is mounted but not on show. */
  paused?: boolean;
  /** Cool end of the rim, at the west edge. */
  rimFrom?: string;
  /** Warm end of the rim, at the east edge. */
  rimTo?: string;
  ink?: string;
  paper?: string;
  className?: string;
}) {
  /* `useId` is stable across server and client, which `Math.random` — what
     the original does — is not. The punctuation React puts in it is legal in
     an id but not inside `url(#…)`, so it is stripped. */
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (part: string) => `blob-${part}-${uid}`;
  const url = (part: string) => `url(#${id(part)})`;

  const svgRef = useRef<SVGSVGElement>(null);

  /* One engine for the life of the component, and never a new one: it carries
     the phase of the loop and the state it is morphing out of, both of which a
     rebuild would throw away mid-travel. `useState` rather than a ref because
     the first frame is wanted during the first render — the server has to
     paint something, and it has to be the same something the client starts
     from. */
  const [engine] = useState(
    () => new BotEngine(RAYON, state, SHAPE, EXPRESSION),
  );
  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(STILL));

  /* The loop reads the latest props from here rather than being torn down and
     rebuilt when they change — a restart would reset the orb's phase and lose
     the morph it was in the middle of. */
  const liveRef = useRef({ state, replay });
  useEffect(() => {
    liveRef.current = { state, replay };
  }, [state, replay]);

  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});
  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  /* Reduced motion: one frame per state, no loop. `sample` being pure, this is
     the real thing frozen rather than an approximation of it, and a state
     change still lands — it just arrives without the travel, which is why the
     rewind is a `reset` and not a `setState`. Its own effect, because this is
     the one path that has to re-run when the state changes; the loop below
     must not, or it would lose its phase every time. */
  useEffect(() => {
    if (!reducedMotion()) return;
    const raf = requestAnimationFrame(() => {
      engine.reset(state, 0);
      setFrame(engine.sample(STILL));
    });
    return () => cancelAnimationFrame(raf);
  }, [engine, state]);

  useEffect(() => {
    const host = svgRef.current;
    if (!host || reducedMotion()) return;

    let raf = 0;
    let running = false;
    let onScreen = false;
    let last = performance.now();
    // Our own clock, so a paused orb resumes where it left off rather than
    // jumping forward by however long it was off screen.
    let clock = 0;
    let cur = liveRef.current.state;
    let since = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;

      const { state: wanted, replay: period } = liveRef.current;
      if (wanted !== cur) {
        // Morphs from whatever is on screen, mid-transition included.
        engine.setState(wanted, clock);
        cur = wanted;
        since = clock;
      } else if (period && clock - since >= period) {
        // `reset` rather than `setState`, which no-ops on the current state:
        // this is a rewind, so there is deliberately no history to blend from.
        engine.reset(cur, clock);
        since = clock;
      }

      setFrame(engine.sample(clock));
      raf = requestAnimationFrame(tick);
    };

    /* Three reasons to be idle — off screen, backgrounded tab, or explicitly
       paused — and one place that resolves them. */
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
  }, [engine]);

  const vb = DEMI_VIEWBOX;
  const dots = frame.dots.map(dotSolid);
  const bodySolid: Solid = { key: "body", d: frame.bodyPath };

  /* Particles that pass behind the core are the only reason these are ever
     two groups rather than one. Everywhere else the body and its dots are the
     same material, lit the same way, in one pass. */
  const behind = frame.dotsBehind ? dots : [];
  const solids = frame.dotsBehind ? [bodySolid] : [bodySolid, ...dots];

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`${-vb} ${-vb} ${vb * 2} ${vb * 2}`}
      role="img"
      aria-label="Rovyk"
      /* `overflow-visible`, and it is load-bearing. The shadow is blurred by
         thirty user units on shapes that already reach a hundred and forty of
         the viewBox's hundred and fifty-eight, so it does not reach zero
         before the edge. Clipped at the viewport — the default — that leaves a
         hard-edged rectangle of light around the orb. It has room to spill:
         the section it sits in is `overflow-x-clip`, so nothing it throws can
         put a scrollbar on the page. */
      className={cn("block overflow-visible", className)}
    >
      <defs>
        {/* Cool to warm across the whole viewBox rather than across each
            shape, so every lit edge on screen — the body, a dot, an orbit
            ring — belongs to one light rather than carrying its own. */}
        <linearGradient
          id={id("rim")}
          gradientUnits="userSpaceOnUse"
          x1={-vb}
          y1={-vb * 0.5}
          x2={vb}
          y2={vb * 0.5}
        >
          <stop offset="0" stopColor={rimFrom} />
          <stop offset="1" stopColor={rimTo} />
        </linearGradient>

        {/* The coloured shadow, in one filter rather than two passes: a tight
            blur for the light sitting against the silhouette and a wider one
            for the fall-off past it. Both are deliberately short. The colour
            has to be findable, not announced — this is a rim on a white orb,
            and a radius big enough to read from across the page stops being a
            rim and becomes a lamp with an orb in front of it. */}
        <filter
          id={id("glow")}
          filterUnits="userSpaceOnUse"
          x={-vb * 2}
          y={-vb * 2}
          width={vb * 4}
          height={vb * 4}
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="5" result="tight" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="13" result="wide" />
          <feMerge>
            <feMergeNode in="wide" />
            <feMergeNode in="tight" />
          </feMerge>
        </filter>

        {/* Just enough blur to feather the border into the body. */}
        <filter
          id={id("bloom")}
          filterUnits="userSpaceOnUse"
          x={-vb * 2}
          y={-vb * 2}
          width={vb * 4}
          height={vb * 4}
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="3" />
        </filter>

        <pattern
          id={id("grain")}
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <image href={GRAIN} width="100" height="100" />
        </pattern>

        {/* Everything solid, minus the eyes. It paints the body, and it is
            also what the grain and the inner edge light are held inside — so
            neither of them creeps across an eye. The eyes being holes rather
            than dark shapes laid on top is what crops them against the
            silhouette on their own as they slide towards its edge, and a dot
            drawn at part opacity thins the mask by exactly that much, which is
            how `thinking` gets its pulse for free. */}
        <mask
          id={id("body")}
          maskUnits="userSpaceOnUse"
          x={-vb}
          y={-vb}
          width={vb * 2}
          height={vb * 2}
        >
          <Paint solids={solids} fill="#fff" />
          {frame.eyes.map((eye, i) => (
            <path
              key={i}
              d={eye.d}
              transform={eye.matrix}
              opacity={eye.alpha}
              fill="#000"
            />
          ))}
          {frame.notch ? (
            <circle
              cx={frame.notch.x}
              cy={frame.notch.y}
              r={frame.notch.r}
              fill="#000"
            />
          ) : null}
        </mask>
      </defs>

      {/* Back halves of the orbits, drawn before the body so the body hides
          them. Lit by the same rim, so a ring reads as the orb's light rather
          than as decoration flying past it — and left unblurred, because a
          ring is already a thin line and blurring one only smears it into a
          band. The glow belongs to the body's edge, not to everything. */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`b${arc.id}`}
            d={arc.back}
            stroke={url("rim")}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {behind.length ? <Paint solids={behind} fill={ink} /> : null}

      <g opacity={frame.bodyAlpha}>
        {/* The coloured shadow, under everything.

            The silhouette FILLED with the gradient and blurred, not stroked:
            a stroke is a thin ring of colour that has almost nothing left to
            give once it is blurred and then has most of what remains covered
            by the opaque body on top of it. A filled shape has the whole area
            behind to spend, and the body hides all of it except the part that
            spreads past the edge — which is the shadow. */}
        <g filter={url("glow")} opacity={0.42}>
          <Paint solids={solids} fill={url("rim")} />
        </g>

        {/* An opaque plate in the exact shape of the body, under the body. The
            eyes are holes, and a hole shows whatever is drawn behind it —
            which, for the back halves of the rings above, is precisely what
            the body is supposed to be hiding. Without this a ring passing
            behind the ball reappears inside the eyes. */}
        <Paint solids={solids} fill={paper} />

        <g mask={url("body")}>
          <rect x={-vb} y={-vb} width={vb * 2} height={vb * 2} fill={ink} />

          {/* The texture. Multiplied, so the noise darkens the white rather
              than washing over it, and it stops at the silhouette. */}
          <rect
            x={-vb}
            y={-vb}
            width={vb * 2}
            height={vb * 2}
            fill={url("grain")}
            opacity={0.22}
            style={{ mixBlendMode: "multiply" }}
          />

          {/* The border, feathered inwards.

              Multiplied, and that is the whole trick. Laid over the body the
              normal way, a blurred stroke of colour on white is colour diluted
              towards white — which is to say invisible, on a body that is
              already white. Multiplied, white takes the colour whole and only
              the blur's own fall-off softens it.

              Kept tight all the same: this also lands on `thinking`'s dots,
              which are a fifth of the ball's radius, and a wide feather there
              meets itself in the middle and stops the dot being white at all. */}
          <g
            filter={url("bloom")}
            opacity={0.7}
            style={{ mixBlendMode: "multiply" }}
          >
            <Paint
              solids={solids}
              fill="none"
              stroke={url("rim")}
              strokeWidth={3.5}
            />
          </g>
        </g>
      </g>

      {/* Front halves of the orbits. */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`f${arc.id}`}
            d={arc.front}
            stroke={url("rim")}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>
    </svg>
  );
}
