import { AppleLogo } from "@/components/apple-logo";
import { cn } from "@/lib/utils";

/**
 * The menu bar the notch hangs out of, at screen-fragment scale.
 *
 * `labels` puts the bar's own furniture — Apple mark, app name, menus,
 * clock — back on the strip. Off by default: these artifacts are close-ups
 * of one piece of chrome, and at this size the labels crowd the thing they
 * are meant to frame. The strip itself always stays, because it is the edge
 * the notch is carved out of; without it the fillets float.
 */
export function ScreenMenuBar({
  labels = false,
  menus = ["File", "Edit", "View"],
  className,
}: {
  labels?: boolean;
  menus?: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex h-5.5 items-center justify-between px-3 text-[9px] text-white/72 backdrop-blur-sm [background:linear-gradient(180deg,rgba(0,0,0,.42),rgba(0,0,0,.06))]",
        className,
      )}
    >
      {labels ? (
        <>
          <div className="flex items-center gap-3">
            <AppleLogo size={10} className="text-white/85" />
            <b className="font-semibold">Rovyk</b>
            {menus.map((menu) => (
              <span key={menu}>{menu}</span>
            ))}
          </div>
          <span>9:41</span>
        </>
      ) : null}
    </div>
  );
}
