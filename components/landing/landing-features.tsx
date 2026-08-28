import {
  CpuIcon,
  GridFourIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";

const FEATURES = [
  {
    icon: CpuIcon,
    title: "On-device by default",
    body: "Hearing and reasoning run locally. Nothing leaves your Mac unless you choose otherwise.",
  },
  {
    icon: GridFourIcon,
    title: "Sixty-one tools, one loop",
    body: "Reads mail, drives apps, browses the web, moves files — and picks the right tool itself.",
  },
  {
    icon: ShieldCheckIcon,
    title: "A gate before anything irreversible",
    body: "Sending, moving, deleting: confirmed before it runs, not after.",
  },
] as const;

/** Three equal columns. Straight vertical hairlines between them on
 *  desktop, nothing else — no top rule floating above the row, which
 *  read as attached to nothing. Stacked and undivided below `sm`. */
export function LandingFeatures() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-[clamp(56px,8vh,104px)] sm:px-10">
      <div className="grid gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col items-center px-0 text-center sm:px-8 sm:first:pl-0 sm:last:pr-0"
          >
            <Icon weight="thin" className="size-7 text-white/70" aria-hidden />
            <h3 className="mt-4 text-[15.5px] font-medium tracking-[-0.01em]">
              {title}
            </h3>
            <p className="mt-2 max-w-[30ch] text-[13.5px] leading-[1.55] font-light text-white/58">
              {body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
