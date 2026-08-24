import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The two marks shared by every disclosure on the page — the corner
   brackets that say "a plate", and the plus that becomes a minus.

   Pulled out of the accordion once the FAQ needed the same pair: two
   copies of a toggle is how two toggles start behaving differently.
   ──────────────────────────────────────────────────────────────────── */

const EASE = "ease-[cubic-bezier(.52,.52,0,1)]";

/** Four bracket marks, one per corner. */
export function Corners({ inset, size }: { inset: string; size: string }) {
  return (
    <>
      {[
        "border-r-0 border-b-0 top-(--in) left-(--in)",
        "border-l-0 border-b-0 top-(--in) right-(--in)",
        "border-r-0 border-t-0 bottom-(--in) left-(--in)",
        "border-l-0 border-t-0 bottom-(--in) right-(--in)",
      ].map((corner) => (
        <span
          key={corner}
          aria-hidden
          style={{ "--in": inset } as React.CSSProperties}
          className={cn("absolute border border-white/22", size, corner)}
        />
      ))}
    </>
  );
}

/**
 * Open and shut, as one mark. The upright bar collapses rather than the
 * whole thing rotating, so nothing swings about — and the brackets arrive
 * as the border leaves, which reads as the control opening out.
 */
export function PlusToggle({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center rounded-lg border transition-colors duration-400",
        open ? "border-transparent" : "border-input",
        className,
      )}
    >
      <span className="absolute h-[1.5px] w-[13px] rounded-full bg-white/80" />
      <span
        className={cn(
          "absolute h-[13px] w-[1.5px] rounded-full bg-white/80 transition-transform duration-400 motion-reduce:transition-none",
          EASE,
          open && "scale-y-0",
        )}
      />
      <span
        className={cn(
          "absolute inset-0 transition-opacity duration-400",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        <Corners inset="0px" size="size-2" />
      </span>
    </span>
  );
}
