/* ────────────────────────────────────────────────────────────────────
   The share card.

   Rendered by satori (via `next/og`), not by a browser, which sets every
   rule below — the same ones `lib/waitlist-email.ts` runs under, for the
   same reason: this markup never meets a stylesheet.

   - Literal hex only. There is no cascade here and no `:root`, so
     `var(--color-background)` resolves to nothing. The palette is
     transcribed below, with the flattening math shown for the two
     tokens the site states as alpha.
   - Inline `style` objects only. No `className`, no Tailwind — satori
     reads the style prop and nothing else.
   - Flexbox only, and every container needs an explicit `display:
     "flex"`. Satori has no block layout; a div with two children and no
     display set is an error, not a default.

   Dark by construction. The card is the product's own ground, and a
   white card for a black-UI product reads as someone else's link.
   ──────────────────────────────────────────────────────────────────── */

/* ── Palette ──────────────────────────────────────────────────────────
   The site's ramp, resolved to literal hex.

   `--background` and `--foreground` are already hex in `globals.css` and
   are copied as-is. `--muted-foreground` is stated there as
   `rgba(255,255,255,.68)`, which is meaningless without something to
   composite against — flattened over `--background` it is
   `.68 x 255 + .32 x 11 = 177` → #b1b1b1. */
const GROUND = "#0b0b0b"; // --background
const INK = "#ffffff"; // --foreground
const MUTED = "#b1b1b1"; // --muted-foreground, flattened over --background

export interface ShioriProps {
  /** The line the card is about. Wraps; keep it to a short sentence. */
  title: string;
  /** Data URI. Satori cannot fetch over the network at build time. */
  logo: string;
  /** Defaults to the product name; here so a sub-brand could differ. */
  brand?: string;
}

export const Shiori = ({ title, logo, brand = "Rovyk" }: ShioriProps) => (
  <div
    style={{
      backgroundColor: GROUND,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: "60px",
      position: "relative",
      width: "100%",
    }}
  >
    {/* No `borderRadius` on the mark, unlike the template this came from.
        That template crops its logo to a circle because it expects an
        avatar; the Rovyk glyph is a square that runs its arms into all
        four corners of its own viewBox, so a circular crop cuts the
        corners off the letterform. The SVG already draws in white, so it
        needs no recolouring against this ground. */}
    {/* eslint-disable-next-line @next/next/no-img-element --
        `next/image` is a React component that renders a browser-optimised
        <img> at request time; satori renders this tree to a PNG at build
        time and understands `img` and nothing else. The rule's advice
        does not apply and cannot be followed here. */}
    <img
      alt=""
      height={96}
      src={logo}
      width={96}
      style={{ objectFit: "contain" }}
    />

    <div
      style={{
        bottom: "60px",
        display: "flex",
        justifyContent: "space-between",
        left: "60px",
        position: "absolute",
        right: "60px",
      }}
    >
      <div
        style={{
          color: MUTED,
          flex: 0.25,
          fontSize: "64px",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.3,
        }}
      >
        {brand}
      </div>

      <div
        style={{
          color: INK,
          flex: 0.6,
          fontSize: "64px",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>

      <div style={{ flex: 0.25 }} />
    </div>
  </div>
);
