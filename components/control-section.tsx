import { GateDemo, HonestyDemo, PermsDemo } from "@/components/control-demos";
import { SectionHead } from "@/components/section-head";
import { MECHANISMS, type Mechanism } from "@/lib/control-mechanisms";
import { cn } from "@/lib/utils";
import { MacWindow } from "./ui/mac-window";

/* ────────────────────────────────────────────────────────────────────
   Control — three mechanisms between the power and the machine.

   The reference lays this out as six equal cells, which is a table with
   rounded corners rather than a bento. Here the spans vary and the
   pairings earn their width: the gate gets the widest demo because it
   is the only one you can actually press, permissions gets the widest
   because it has the most rows, and the sides alternate so the eye
   crosses the grid rather than running down a column.

   The claims are set as spec, not as prose in a box. Every framed cell
   in this grid is a demo; every open one is a statement about what the
   demo beside it is doing. Six identical cards would have said the two
   were the same kind of thing.

   Two of the three demos are live. The gate really does cancel, and the
   permission switches really do turn off — the caption on each promises
   as much, and a claim about control that you cannot exercise is a
   screenshot of a claim about control.
   ──────────────────────────────────────────────────────────────────── */

/**
 * A claim, read as a spec sheet: a rule, what it is called, what it does,
 * and the three facts that make it checkable. No icon and no paragraph —
 * the section's argument is mechanical, and prose in a rounded box was
 * dressing it as marketing.
 */
function SpecCard({ m, className }: { m: Mechanism; className?: string }) {
  return (
    <MacWindow
      // Everything inside measures against the card, not the screen: this one
      // is five columns of twelve on a desktop and the whole width on a
      // phone, so a viewport breakpoint would be answering the wrong
      // question in both places.
      className={cn("@container/spec bg-card/50", className)}
      title={
        <span className="min-w-0 truncate font-mono text-[10.5px] tracking-[0.18em] text-white/40 uppercase">
          {/* "Mechanism 02 - Honesty check" is seven pixels too wide for a
              302px card, and the bar is a fixed 44px — so it wrapped to a
              second line and pushed itself out through the chrome. The
              number and the name are the part worth keeping. */}
          <span className="hidden @[22rem]/spec:inline">Mechanism </span>
          {m.n} - {m.name}
        </span>
      }
    >
      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-7 max-w-[20ch] text-[clamp(24px,2.4vw,32px)] leading-[1.1] tracking-[-0.03em]">
          {m.title}
        </h3>

        {/* Pinned to the bottom, so the rows line up with the foot of the
          demo beside them however long a claim runs.

          The label column is a fixed 128px, which is what makes the rows
          read as a spec sheet rather than a list — and what left the value
          104px on a phone, wrapping "claims against what ran" over two
          lines. Narrow enough, the pair stacks instead: the labels still
          align, because they all start at the same edge, and the value gets
          the whole card. */}
        <dl className="mt-auto">
          {m.spec.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-1 border-t border-border py-2.5 @[22rem]/spec:flex-row @[22rem]/spec:items-baseline @[22rem]/spec:gap-5"
            >
              <dt className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-white/34 uppercase @[22rem]/spec:w-32">
                {label}
              </dt>
              <dd className="text-[13.5px] font-light text-white/85">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </MacWindow>
  );
}

export function ControlSection() {
  const [gate, honesty, perms] = MECHANISMS;

  return (
    <section id="safe" className="relative py-(--section-y)">
      <div className="mx-auto w-full max-w-7xl px-4">
        <SectionHead
          eyebrow="control"
          title="Why you can hand it the keys to your Mac"
          className="mb-10 sm:mb-16"
        >
          It is unsandboxed, it clicks real buttons and it touches real files.
          Three mechanisms sit between that power and your machine.
        </SectionHead>

        {/* Uneven on purpose. Each demo takes the width its content needs,
            and the sides swap every row so the eye crosses the grid.

            The swap is a wide-screen idea, so it is a wide-screen ordering.
            In the source every mechanism reads the same way — the claim, then
            the demo of it — which is the order a single column gets. The
            alternation is put back at `lg` with `order`, where there is a
            grid for the eye to cross.

            Stacked, the old source order meant mechanism 02 arrived
            backwards: three ticks labelled "Honesty check" before anything
            had said what mechanism 02 was or what it promised. The other two
            read claim-first, so it was not even a consistent inversion.

            All six carry an order rather than just the pair that moves:
            anything left at the default sorts ahead of everything with one,
            so a partial set would scatter the grid rather than swap a row.

            The 320px row floor is what makes a claim and the demo beside it
            share a baseline. Stacked, there is nothing beside anything — so
            it only bought the spec cards ninety pixels of gap between the
            headline and the rows nobody asked to be spread out. */}
        <div className="grid gap-x-4.5 gap-y-9 sm:gap-y-14 lg:auto-rows-[minmax(320px,auto)] lg:grid-cols-12 lg:gap-y-4.5">
          <SpecCard m={gate} className="lg:order-1 lg:col-span-5" />
          <GateDemo className="lg:order-2 lg:col-span-7" />

          <SpecCard m={honesty} className="lg:order-4 lg:col-span-5" />
          <HonestyDemo className="lg:order-3 lg:col-span-7" />

          <SpecCard m={perms} className="lg:order-5 lg:col-span-4" />
          <PermsDemo className="lg:order-6 lg:col-span-8" />
        </div>
      </div>
    </section>
  );
}
