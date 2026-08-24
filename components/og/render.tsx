/* ────────────────────────────────────────────────────────────────────
   Rendering the share card.

   Every `opengraph-image.tsx` in the app is three lines of metadata and
   a call to `ogImage()`. The assets are read once, here, at module
   scope — satori needs real font bytes and a real image, and reading
   them per request would do it again for every card.

   These routes are statically optimised: Next runs them at build time
   and serves PNGs. Nothing below touches the network or the request, so
   there is no runtime cost and no build that depends on a font CDN
   being up.
   ──────────────────────────────────────────────────────────────────── */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { Shiori } from "./shiori";

/** 1200x630 — the size every scraper crops from, and the one Next
 *  writes into `og:image:width` / `height`. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_CONTENT_TYPE = "image/png";

/* DM Sans is the site's typeface (`--font-heading` resolves to it), and
   the card should not be the one place the brand sets in something else.
   It is vendored under `assets/fonts/` rather than fetched from Google
   at build time on purpose: satori needs `ttf`/`otf` bytes — it cannot
   use the `woff2` that `next/font` downloads — and a build that reaches
   out to a CDN for a file this load-bearing is a build that can fail
   offline. Two weights, because satori matches the nearest weight it was
   given rather than synthesising one. */
const [dmSansRegular, dmSansSemiBold, logoSvg] = await Promise.all([
  readFile(join(process.cwd(), "assets/fonts/DMSans-Regular.ttf")),
  readFile(join(process.cwd(), "assets/fonts/DMSans-SemiBold.ttf")),
  readFile(join(process.cwd(), "public/assets/rovyk-logo.svg")),
]);

/* Satori resolves `src` itself and has no origin to resolve a path
   against at build time, so the mark is inlined rather than linked. */
const LOGO_DATA_URI = `data:image/svg+xml;base64,${logoSvg.toString("base64")}`;

const FONTS = [
  {
    name: "DM Sans",
    data: dmSansRegular,
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "DM Sans",
    data: dmSansSemiBold,
    weight: 600 as const,
    style: "normal" as const,
  },
];

/** One share card. `title` is the only thing that differs per page. */
export function ogImage(title: string): ImageResponse {
  return new ImageResponse(<Shiori logo={LOGO_DATA_URI} title={title} />, {
    ...OG_SIZE,
    fonts: FONTS,
  });
}
