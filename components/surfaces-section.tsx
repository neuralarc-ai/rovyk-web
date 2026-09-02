import { FocusDemo } from "@/components/focus-demo";
import { GhostWindow } from "@/components/ghost-window";
import { RovykHud } from "@/components/rovyk-hud";
import { ScreenMenuBar } from "@/components/screen-menu-bar";
import { SectionHead } from "@/components/section-head";
import { MacWindow } from "@/components/ui/mac-window";
import { DOWNLOADS_FLOW } from "@/lib/hud-flows";
import { cn } from "@/lib/utils";
import { AppleLogo } from "./apple-logo";
import { DownloadButton } from "./cta-button";
import { ArrowFatUpIcon, CommandIcon, OptionIcon } from "@phosphor-icons/react/dist/ssr";

/* ────────────────────────────────────────────────────────────────────
   Surfaces — where the agent can be.

   The weight is deliberately on the artwork, not the words: the stage is
   360–470px against roughly 150px of copy. Each artifact floats in the
   middle of a grid rather than filling the panel, so the card reads as a
   fragment of a screen caught mid-work.
   ──────────────────────────────────────────────────────────────────── */

/**
 * Two thirds of the card. The copy gets what is left.
 *
 * Sized against the card rather than the viewport. The height used to floor
 * at 390px, which is most of a phone screen and nearly twice as tall as the
 * artifact it was framing — a 16:11 screen at 302px of card is 175px, so the
 * stage was 200px of empty graph paper wrapped around it. It is worse than
 * it sounds in a two-column row, where the card is half the width but the
 * stage was still the same fixed height.
 *
 * `cqw` is the card's own width, so one expression covers a phone, a single
 * column and a two-column row without knowing which it is in. The floor is
 * what the focus demo needs: a header, a footer and three lines of transcript
 * between them.
 */
const STAGE =
  "relative flex h-[clamp(268px,70cqw,500px)] items-center justify-center overflow-hidden border-b border-border bg-background px-6 sm:px-7.5";

/** Both artifacts float at the same width and cast the same shadow. */
const FLOAT =
  "relative w-full max-w-130 overflow-hidden rounded-2xl shadow-[0_30px_64px_-28px_#000]";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-4.75 items-center justify-center rounded-sm border border-input bg-accent px-1.5 font-mono text-xs leading-none text-white">
      {children}
    </kbd>
  );
}

function ChromeTitle({ children }: { children: React.ReactNode }) {
  /* `min-w-0 truncate` so a bar too narrow for both loses the tail of the
     index rather than wrapping to a second line inside a 44px strip and
     pushing the tag out through the chrome. */
  return (
    <span className="min-w-0 truncate font-mono text-[10px] tracking-[0.16em] text-white/45 uppercase">
      {children}
    </span>
  );
}

/**
 * A pill in the title bar, carrying the one number worth reading.
 *
 * Below about 26rem of card there is no room for it and the index together —
 * which is a card width, not a screen width, so it happens on a phone and
 * again in a narrow two-column row. It leaves rather than truncating: half a
 * measurement is worse than none, and the index is the label of the two.
 */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden shrink-0 rounded-full border border-input bg-background px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-white/55 uppercase @[26rem]/surface:inline">
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
              className="size-1 shrink-0 rounded-full bg-white/22"
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

            Scaled to the card it is in rather than to the viewport —
            expanded the notch is 404px, wider than this screen on a phone,
            and a two-column row makes the card narrow at any screen size. */}
        <RovykHud
          flow={DOWNLOADS_FLOW}
          className="z-30 scale-[0.55] @[26rem]/surface:scale-[0.7] @[34rem]/surface:scale-[0.8]"
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
        <Kbd>
          <OptionIcon  />
        </Kbd>
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
        <Kbd>
          <CommandIcon  />
        </Kbd>
        <Kbd>
          <ArrowFatUpIcon  />
        </Kbd>
        <Kbd>space</Kbd>
      </>,
      <>Full scrollback</>,
      <>Meetings &amp; open offices</>,
    ],
  },
];

export function SurfacesSection() {
  return (
    <section id="where" className="relative py-(--section-y)">
      <div className="mx-auto w-full max-w-7xl px-4">
        <SectionHead
          eyebrow="surfaces"
          title="Where can I be?"
          className="mb-10 sm:mb-16"
        >
          Two surfaces, one agent. Switch mid-sentence, it keeps the thread.
        </SectionHead>

        {/* Two columns from `lg`. At `md` the row splits a 648px container
            into 315px cards — narrower than the single column a phone gets,
            so the artwork got smaller as the screen got bigger. */}
        <div className="grid gap-4.5 lg:grid-cols-2">
          {SURFACES.map((surface) => (
            <MacWindow
              key={surface.id}
              // The card is the container everything inside it measures
              // against — the stage's height, the tag, the notch's scale.
              className="@container/surface"
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
        <div className="relative mt-4.5 flex flex-col items-start gap-6 overflow-hidden px-6 py-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8.5 sm:gap-y-8 sm:px-8.5 sm:py-8">
          <div className="relative z-10 w-full sm:min-w-65 sm:flex-1">
            <h3 className="mb-2 text-[clamp(22px,2.4vw,30px)] leading-[1.1] font-medium tracking-[-0.03em] text-balance">
              Both surfaces, one&nbsp;84&nbsp;MB download
            </h3>
            <p className="text-[13.5px] leading-[1.55] font-light text-white/68">
              Apple Silicon, macOS 27 or later. No account, no sign-up, nothing
              to configure.
            </p>
          </div>

          {/* <div className="relative z-10 flex flex-col items-start gap-3">
            <a
              href="#cta"
              className="inline-flex h-14.5 items-center justify-center gap-2.5 rounded-xl bg-primary px-7.5 text-base font-semibold tracking-[-0.012em] whitespace-nowrap text-primary-foreground shadow-[0_18px_44px_-18px_rgba(255,255,255,.5)] transition-[transform,background] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0 active:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <AppleLogo size={20} />
              Download for Apple Silicon
            </a>
          </div> */}
          <DownloadButton href="#cta" className="w-full sm:w-auto">
            Download for Mac
          </DownloadButton>
        </div>
      </div>
    </section>
  );
}
