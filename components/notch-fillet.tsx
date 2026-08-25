"use client";

import { useId } from "react";
import { EDGE_BLEED, EDGE_LIGHT, FILLET_W, NOTCH_H } from "@/lib/notch";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The fillet: the curve joining the thin bar to whatever hangs off it.

   Taken verbatim from the Figma export. It is a cubic S-curve with
   horizontal tangents at BOTH ends, not a circular arc, so it flows
   continuously into a flat bottom with no vertical side and no rounded
   corner. A radial-gradient mask (the usual trick, and what the HUD in
   the hero uses) cannot express that shape.

   `fill` closes along the top edge to fill above the curve; `edge` is
   the bare curve, so only the silhouette is lit. The stroke fades out
   at the end that meets the bar, which is what stops the notch looking
   like it has been pasted on.
   ──────────────────────────────────────────────────────────────────── */

export const FILLET = {
  l: {
    fill: "M0 0C45.98 0 37 34 87 34V0Z",
    edge: "M0 0C45.98 0 37 34 87 34",
    /* Gradient runs outward → inward, so `0` is always the bar end. */
    from: { x1: 0, x2: FILLET_W },
    margin: "-mr-px",
  },
  r: {
    fill: "M87 0C41.02 0 50 34 0 34V0Z",
    edge: "M87 0C41.02 0 50 34 0 34",
    from: { x1: FILLET_W, x2: 0 },
    margin: "-ml-px",
  },
} as const;

export function Fillet({
  side,
  w = FILLET_W,
  h = NOTCH_H,
  fill = "currentColor",
  className,
}: {
  side: "l" | "r";
  w?: number;
  h?: number;
  fill?: string;
  className?: string;
}) {
  const { fill: d, edge, from, margin } = FILLET[side];
  const gradientId = `${useId()}-notch-edge`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${FILLET_W} ${NOTCH_H}`}
      // Squashing and stretching are the point, so the artwork is not allowed
      // to letterbox itself back to its native ratio.
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
      className={cn("block shrink-0 overflow-visible", margin, className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          {...from}
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="#fff" stopOpacity={EDGE_BLEED} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={EDGE_BLEED + 0.14} />
          <stop offset="1" stopColor="#fff" stopOpacity={EDGE_LIGHT} />
        </linearGradient>
      </defs>
      <path d={d} fill={fill} />
      {/* Nudged up half a unit: a stroke is centred on its path, so without
          this it straddles the shape's edge and lands half a pixel below the
          body's hairline, leaving a visible step where the two meet.

          `non-scaling-stroke` because the corner tabs run the curve at 52px
          rather than 87 — without it the line thins with the squash. */}
      <path
        d={edge}
        stroke={`url(#${gradientId})`}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        fill="none"
        transform="translate(0 -0.5)"
      />
    </svg>
  );
}
