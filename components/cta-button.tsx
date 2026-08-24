import { AppleLogo } from "@/components/apple-logo";
import { cn } from "@/lib/utils";

/**
 * The page's two calls to action, in the only two weights it uses.
 *
 * Shared rather than restated: the hero and the closer make the same offer,
 * and a button that had drifted between the top and the bottom of one page
 * would read as two different products. Anchors, not buttons — every one of
 * them is a navigation, and the download will be a real href.
 */

const BASE =
  "inline-flex h-11.5 items-center justify-center gap-2.5 rounded-xl border px-6 text-[14.5px] font-medium tracking-[-0.005em] whitespace-nowrap transition-[transform,background,border-color] duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function DownloadButton({
  href = "#",
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={cn(
        BASE,
        "border-primary bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        className,
      )}
    >
      {/* Nudged up a hair: the leaf makes the mark top-light, so a centred
          bounding box sits visually low against the label. */}
      <AppleLogo size={17} className="-translate-y-px" />
      {children}
    </a>
  );
}

export function GhostButton({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={cn(
        BASE,
        "border-input bg-secondary text-secondary-foreground hover:border-white/30 hover:bg-accent active:bg-secondary",
        className,
      )}
    >
      {children}
    </a>
  );
}
