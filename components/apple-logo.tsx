import { cn } from "@/lib/utils";

/**
 * The Apple logo, as vector.
 *
 * Not the U+F8FF glyph (``): that is a private-use codepoint which only
 * Apple's system fonts map to the logo — on Windows, Linux and Android it
 * renders as tofu or as whatever the font happens to put there. And not the
 * Phosphor icon, whose silhouette is a redraw rather than the real curve.
 *
 * Sized by `size`, which sets the height; the width comes from the viewBox, so
 * it can never be given a ratio that disagrees with the artwork. `className`
 * is left for colour and positioning.
 *
 * Decorative by default — it is only ever used beside a label that already
 * says "Mac", so it is hidden from the accessibility tree unless a caller
 * passes an explicit `aria-label`.
 */
export function AppleLogo({
  size = 16,
  className,
  "aria-label": ariaLabel,
}: {
  /** Rendered height. Width follows the artwork's proportions. */
  size?: number | string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <svg
      viewBox="0 0 814 1000"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...(ariaLabel
        ? { role: "img", "aria-label": ariaLabel }
        : { "aria-hidden": true })}
      style={{ height: size }}
      className={cn("block w-auto", className)}
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}
