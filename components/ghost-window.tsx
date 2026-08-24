import { cn } from "@/lib/utils";

/**
 * A faint app window on the desktop behind the notch, so the screen does not
 * read as empty. Furniture — no real content, just the shape of work. The
 * label is whichever app the run in front of it happens to be driving.
 */
export function GhostWindow({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "mask-fade-b absolute inset-x-[11%] -bottom-[6%] h-[62%] overflow-hidden rounded-xl border border-white/10 shadow-[0_26px_60px_-30px_#000] [--fade-start:52%] [background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))]",
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-white/8 px-2.5 py-2">
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="ml-2 font-mono text-[8.5px] tracking-[0.14em] text-white/34 uppercase">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-3">
        {[64, 88, 41, 73, 55].map((w, i) => (
          <span
            key={i}
            style={{ width: `${w}%` }}
            className="h-[5px] rounded-[3px] bg-white/10"
          />
        ))}
      </div>
    </div>
  );
}
