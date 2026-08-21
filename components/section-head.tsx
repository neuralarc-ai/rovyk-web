import { cn } from "@/lib/utils";

/**
 * The heading block every section opens with: a bracketed eyebrow, the
 * question, and one line answering it. Centred, and deliberately narrow —
 * the measure is what keeps a 58px headline readable.
 */
export function SectionHead({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-[18px] text-center", className)}>
      <span className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <span className="text-white/36">[</span>
        {eyebrow}
        <span className="text-white/36">]</span>
      </span>

      <h2 className="max-w-[23ch] text-[clamp(32px,4.3vw,58px)] leading-[1.06] font-medium tracking-[-0.035em]">
        {title}
      </h2>

      {children ? (
        <p className="max-w-[56ch] text-[clamp(15px,1.25vw,17px)] leading-[1.62] font-light tracking-[-0.004em] text-muted-foreground">
          {children}
        </p>
      ) : null}
    </div>
  );
}
