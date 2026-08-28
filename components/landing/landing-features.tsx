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

/** Three equal columns — same `sm:grid-cols-3`, zero gap, as `LandingSpecs`
 *  reads its own alignment off. Between them a hairline that floats rather
 *  than a flat rule: solid at its centre, dissolved into nothing at both
 *  ends, so it reads as light rather than as a drawn line. Stacked and
 *  undivided below `sm`. */
export function LandingFeatures() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-[clamp(56px,8vh,104px)] sm:px-10">
      <div className="grid gap-14 sm:grid-cols-3 sm:gap-0">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className="relative flex flex-col items-center px-0 text-center sm:px-9 sm:first:pl-0 sm:last:pr-0"
          >
            {i > 0 && (
              <span
                aria-hidden
                className="absolute inset-y-2 left-0 hidden w-px bg-linear-to-b from-transparent via-white/18 to-transparent sm:block"
              />
            )}

            {/* The icon sits inside a muted die rather than bare on the
                page — the same "chip mark" register the requirements
                section's own marks use — with a soft white glow behind
                it, since a flat line icon on black reads as a hole
                rather than something lit. */}
            <span className="relative grid size-15 place-items-center rounded-2xl bg-white/6 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,.16),transparent_75%)]"
              />
              <Icon
                weight="thin"
                className="relative size-8 text-white/85 drop-shadow-[0_0_10px_rgba(255,255,255,.4)]"
                aria-hidden
              />
            </span>

            <h3 className="mt-5 text-[18px] font-medium tracking-[-0.015em]">
              {title}
            </h3>
            <p className="mt-2.5 max-w-[32ch] text-[14.5px] leading-[1.6] font-light text-white/60">
              {body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
