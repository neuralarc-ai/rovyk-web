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
      className={cn("bg-card/50", className)}
      title={
        <span className="font-mono text-[10.5px] tracking-[0.18em] text-white/40 uppercase">
          Mechanism {m.n} - {m.name}
        </span>
      }
    >
      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-7 max-w-[20ch] text-[clamp(24px,2.4vw,32px)] leading-[1.1] tracking-[-0.03em]">
          {m.title}
        </h3>

        {/* Pinned to the bottom, so the rows line up with the foot of the
          demo beside them however long a claim runs. */}
        <dl className="mt-auto">
          {m.spec.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline gap-5 border-t border-border py-2.5"
            >
              <dt className="w-[128px] shrink-0 font-mono text-[10px] tracking-[0.14em] text-white/34 uppercase">
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
    <section id="safe" className="relative py-[clamp(96px,12.5vh,158px)]">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <SectionHead
          eyebrow="control"
          title="Why you can hand it the keys to your Mac"
          className="mb-16"
        >
          It is unsandboxed, it clicks real buttons and it touches real files.
          Three mechanisms sit between that power and your machine.
        </SectionHead>

        {/* Uneven on purpose. Each demo takes the width its content needs,
            and the sides swap every row so the eye crosses the grid. */}
        <div className="grid auto-rows-[minmax(320px,auto)] gap-x-4.5 gap-y-14 lg:grid-cols-12 lg:gap-y-4.5">
          <SpecCard m={gate} className="lg:col-span-5" />
          <GateDemo className="lg:col-span-7" />

          <HonestyDemo className="lg:col-span-7" />
          <SpecCard m={honesty} className="lg:col-span-5" />

          <SpecCard m={perms} className="lg:col-span-4" />
          <PermsDemo className="lg:col-span-8" />
        </div>
      </div>
    </section>
  );
}
