import { FocusDemo } from "@/components/focus-demo";
import { GhostWindow } from "@/components/ghost-window";
import { RovykHud } from "@/components/rovyk-hud";
import { ScreenMenuBar } from "@/components/screen-menu-bar";
import { SectionHead } from "@/components/section-head";
import { MacWindow } from "@/components/ui/mac-window";
import { DOWNLOADS_FLOW } from "@/lib/hud-flows";
import { cn } from "@/lib/utils";
import { AppleLogo } from "./apple-logo";

/* ────────────────────────────────────────────────────────────────────
   Surfaces — where the agent can be.

   The weight is deliberately on the artwork, not the words: the stage is
   360–470px against roughly 150px of copy. Each artifact floats in the
   middle of a grid rather than filling the panel, so the card reads as a
   fragment of a screen caught mid-work.
   ──────────────────────────────────────────────────────────────────── */

/** Two thirds of the card. The copy gets what is left. */
const STAGE =
  "relative flex h-[clamp(390px,44vh,500px)] items-center justify-center overflow-hidden border-b border-border bg-background px-6 sm:px-7.5";

/** Both artifacts float at the same width and cast the same shadow. */
const FLOAT =
  "relative w-full max-w-130 overflow-hidden rounded-2xl shadow-[0_30px_64px_-28px_#000]";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4.75 min-w-4.75 items-center justify-center rounded-sm border border-input bg-accent px-1.5 font-mono text-[11px] leading-none text-white">
      {children}
    </kbd>
  );
}

function ChromeTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] tracking-[0.16em] text-white/45 uppercase">
      {children}
    </span>
  );
}

/** A pill in the title bar, carrying the one number worth reading. */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-input bg-background px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-white/55 uppercase">
      {children}
    </span>
  );
}

function MetaStrip({
  items,
  className,
}: {
  items: React.ReactNode[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 font-mono text-[10.5px] tracking-[0.08em] text-white/36 uppercase",
        className,
      )}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2.5">
          {i > 0 ? (
            <i
              aria-hidden
              className="size-0.75 shrink-0 rounded-full bg-white/22"
            />
          ) : null}
          <span className="flex items-center gap-1.5">{item}</span>
        </span>
      ))}
    </div>
  );
}

/** Hairline graph paper, dissolving before it reaches any edge. */
function StageGrid() {
  return (
    <div
      aria-hidden
      className="bg-hairline-grid mask-grid-center absolute inset-0"
    />
  );
}

/**
 * The notch, on a screen fragment that dissolves before the panel ends.
 *
 * `labels` puts the menu bar's own furniture — app name, menus, clock — back
 * on the strip. Off here: this card is a close-up of one piece of chrome, and
 * at this size the labels crowd the thing they are meant to frame. The strip
 * itself stays, because it is the edge the notch is carved out of.
 */
function NotchStage({ labels = false }: { labels?: boolean }) {
  return (
    <div className={STAGE}>
      <StageGrid />
      <div
        className={cn(
          FLOAT,
          "mask-fade-b bg-display-wall aspect-16/11 [--fade-start:74%]",
          "shadow-[0_0_0_1px_rgba(255,255,255,.17),0_0_0_5px_rgba(255,255,255,.03),0_30px_64px_-28px_#000]",
        )}
      >
        <ScreenMenuBar labels={labels} />

        <GhostWindow label="Downloads" />

        {/* A different run from the hero's, so the page is not telling the
            same story twice — and a longer chain, which is the case the
            shell has to grow for.

            Scaled to the artifact, not the viewport — expanded the notch is
            404px, wider than this screen on a phone. */}
        <RovykHud
          flow={DOWNLOADS_FLOW}
          className="z-30 scale-[0.55] md:scale-[0.62] lg:scale-[0.8]"
        />
      </div>
    </div>
  );
}

/** Focus mode — the window, running its own errand. See `FocusDemo`. */
function FocusStage() {
  return (
    <div className={cn(STAGE, "items-stretch p-4 sm:p-5")}>
      <StageGrid />
      <FocusDemo className="relative h-full w-full overflow-hidden rounded-2xl border border-input bg-secondary shadow-[0_30px_64px_-28px_#000]" />
    </div>
  );
}

const SURFACES = [
  {
    id: "notch",
    index: "01 · The notch",
    tag: "26px at rest",
    title: "Hands free, in the menu bar",
    description: "Say the wake word. It drops open, works, then retracts.",
    stage: <NotchStage />,
    meta: [
      <>
        <Kbd>⌥</Kbd>
        <Kbd>space</Kbd>
      </>,
      <>&ldquo;Hey Rovyk&rdquo;</>,
      <>No window, no dock icon</>,
    ],
  },
  {
    id: "focus",
    index: "02 · Focus mode",
    tag: "type or talk",
    title: "A window, when talking is not an option",
    description: "Unpin the notch and type instead. Same brain, same gate.",
    stage: <FocusStage />,
    meta: [
      <>
        <Kbd>⌘</Kbd>
        <Kbd>⇧</Kbd>
        <Kbd>space</Kbd>
      </>,
      <>Full scrollback</>,
      <>Meetings &amp; open offices</>,
    ],
  },
];

export function SurfacesSection() {
  return (
    <section id="where" className="relative py-[clamp(96px,12.5vh,158px)]">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <SectionHead
          eyebrow="surfaces"
          title="Where can I be?"
          className="mb-16"
        >
          Two surfaces, one agent. Switch mid-sentence, it keeps the thread.
        </SectionHead>

        <div className="grid gap-4.5 md:grid-cols-2">
          {SURFACES.map((surface) => (
            <MacWindow
              key={surface.id}
              title={<ChromeTitle>{surface.index}</ChromeTitle>}
              trailing={<Tag>{surface.tag}</Tag>}
            >
              {surface.stage}

              <div className="flex flex-1 flex-col px-6.5 pt-6 pb-5.5">
                <h3 className="mb-2 text-[clamp(20px,1.7vw,23px)] leading-[1.2] font-medium tracking-[-0.028em]">
                  {surface.title}
                </h3>
                <p className="mb-4.5 max-w-[38ch] text-sm leading-[1.55] font-light text-white/68">
                  {surface.description}
                </p>
                {/* Pinned to the bottom so the strips line up across the row
                    even when one description wraps and the other does not. */}
                <MetaStrip
                  items={surface.meta}
                  className="mt-auto border-t border-border pt-3.5"
                />
              </div>
            </MacWindow>
          ))}
        </div>

        {/* One download for both. Lit from the right so the bar has a bright
            end and a quiet end rather than being evenly filled. */}
        <div className="relative mt-4.5 flex flex-wrap items-center gap-x-8.5 gap-y-8 overflow-hidden rounded-3xl border border-input bg-card px-8.5 py-8">
          <div
            aria-hidden
            className="bg-cta-glow pointer-events-none absolute inset-0"
          />
          <div
            aria-hidden
            className="bg-hairline-grid mask-grid-right pointer-events-none absolute inset-0 [--grid-size:96px]"
          />

          <div className="relative z-10 min-w-65 flex-1">
            <h3 className="mb-2 text-[clamp(22px,2.4vw,30px)] leading-[1.1] font-medium tracking-[-0.03em] text-balance">
              Both surfaces, one&nbsp;84&nbsp;MB download
            </h3>
            <p className="text-[13.5px] leading-[1.55] font-light text-white/68">
              Apple Silicon, macOS 15 or later. No account, no sign-up, nothing
              to configure.
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-start gap-3">
            <a
              href="#cta"
              className="inline-flex h-14.5 items-center justify-center gap-2.5 rounded-xl bg-primary px-7.5 text-base font-semibold tracking-[-0.012em] whitespace-nowrap text-primary-foreground shadow-[0_18px_44px_-18px_rgba(255,255,255,.5)] transition-[transform,background] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0 active:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <AppleLogo size={20} />
              Download for Apple Silicon
            </a>

            <div className="flex flex-wrap items-center gap-3.5 font-mono text-[12.5px] tracking-[0.04em] text-white/36">
              <span>Free</span>
              <i aria-hidden className="size-0.75 rounded-full bg-white/22" />
              <a
                href="#"
                className="border-b border-input pb-px text-white/68 transition-colors hover:border-brand-indigo hover:text-white"
              >
                Homebrew
              </a>
              <i aria-hidden className="size-0.75 rounded-full bg-white/22" />
              <a
                href="#"
                className="border-b border-input pb-px text-white/68 transition-colors hover:border-brand-indigo hover:text-white"
              >
                Changelog
              </a>
              <i aria-hidden className="size-0.75 rounded-full bg-white/22" />
              <span>v0.9</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
