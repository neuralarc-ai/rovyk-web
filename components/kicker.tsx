import { cn } from "@/lib/utils";

/**
 * The site's small caps, bracketed the way every eyebrow on this page is.
 * Brackets dimmer than the word, so they read as punctuation rather than as
 * two more characters.
 *
 * Shared by the footer's link index and the touch drawer's, which are the
 * same thing shown two ways and should not drift apart.
 */
export function Kicker({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.16em] text-white/40 uppercase",
        className,
      )}
    >
      <span className="text-white/22">[</span>
      {children}
      <span className="text-white/22">]</span>
    </span>
  );
}
