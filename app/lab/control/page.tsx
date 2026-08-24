import type { Metadata } from "next";
import { GateDemo, HonestyDemo, PermsDemo } from "@/components/control-demos";
import { MECHANISMS, type Mechanism } from "@/lib/control-mechanisms";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   Throwaway. Four card treatments for the control section, same copy
   and the same live demos in each, so the only variable is the card.
   Delete this route once one is picked.
   ──────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Lab — control card treatments",
  robots: { index: false, follow: false },
};

const DEMOS = [GateDemo, HonestyDemo, PermsDemo];

function Lane({
  n,
  name,
  note,
  children,
}: {
  n: string;
  name: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-10">
      <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-[11px] tracking-[0.18em] text-white/34 uppercase">
          Variation {n}
        </span>
        <h2 className="text-[22px] tracking-[-0.02em]">{name}</h2>
        <p className="max-w-[62ch] text-[13.5px] leading-[1.55] font-light text-white/45">
          {note}
        </p>
      </div>
      {children}
    </section>
  );
}

/* ── A · Spec sheet ────────────────────────────────────────────────── */

function SpecCard({ m, className }: { m: Mechanism; className?: string }) {
  return (
    <div
      className={cn("flex flex-col border-t border-white/22 pt-5", className)}
    >
      <div className="mb-6 flex items-baseline justify-between font-mono text-[10.5px] tracking-[0.18em] text-white/40 uppercase">
        <span>
          Mechanism {m.n} &mdash; {m.name}
        </span>
      </div>
      <h3 className="mb-7 max-w-[20ch] text-[clamp(24px,2.4vw,32px)] leading-[1.1] tracking-[-0.03em]">
        {m.title}
      </h3>
      <dl className="mt-auto">
        {m.spec.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline gap-5 border-t border-border py-2.5"
          >
            <dt className="w-32 shrink-0 font-mono text-[10px] tracking-[0.14em] text-white/34 uppercase">
              {k}
            </dt>
            <dd className="text-[13.5px] font-light text-white/85">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── B · Editorial ─────────────────────────────────────────────────── */

function EditorialCard({ m, className }: { m: Mechanism; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden py-2", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute -top-6 -left-3 font-mono text-[128px] leading-none font-medium tracking-tighter text-white/4.5 select-none"
      >
        {m.n}
      </span>
      <div className="relative">
        <h3 className="mb-4 max-w-[16ch] text-[clamp(26px,2.9vw,38px)] leading-[1.05] tracking-[-0.035em]">
          {m.title}
        </h3>
        <p className="max-w-[44ch] border-l border-white/22 pl-5 text-sm leading-[1.65] font-light text-white/62">
          {m.body}
        </p>
      </div>
    </div>
  );
}

/* ── C · Plate ─────────────────────────────────────────────────────── */

function PlateCard({ m, className }: { m: Mechanism; className?: string }) {
  const Icon = m.icon;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-sm border border-white/22 bg-[#101010] p-7",
        "before:pointer-events-none before:absolute before:inset-1 before:rounded-[3px] before:border before:border-white/8",
        className,
      )}
    >
      <div className="relative mb-9 flex items-center gap-3">
        <Icon weight="light" className="size-5 text-white/70" aria-hidden />
        <span className="font-mono text-[10px] tracking-[0.22em] text-white/50 uppercase">
          {m.name}
        </span>
        <span className="ml-auto font-mono text-[10px] text-white/22">
          {m.n}/03
        </span>
      </div>
      <h3 className="relative mb-3.5 max-w-[19ch] text-[21px] leading-[1.2] tracking-[-0.022em]">
        {m.title}
      </h3>
      <p className="relative max-w-[46ch] text-[13.5px] leading-[1.6] font-light text-white/58">
        {m.body}
      </p>
      <div className="relative mt-7 flex flex-wrap gap-1.5">
        {m.tags.map((t) => (
          <span
            key={t}
            className="rounded-[3px] border border-white/12 px-2 py-1 font-mono text-[10px] tracking-[0.06em] text-white/45"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── D · One card per mechanism ────────────────────────────────────── */

function PairedRow({ m, i }: { m: Mechanism; i: number }) {
  const Demo = DEMOS[i];
  return (
    <div className="grid overflow-hidden rounded-2xl border border-input bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-center px-8 py-9 lg:px-10">
        <span className="mb-5 font-mono text-[10.5px] tracking-[0.18em] text-white/34 uppercase">
          {m.n} &middot; {m.name}
        </span>
        <h3 className="mb-3.5 max-w-[18ch] text-[clamp(22px,2.2vw,29px)] leading-[1.14] tracking-[-0.028em]">
          {m.title}
        </h3>
        <p className="max-w-[48ch] text-sm leading-[1.6] font-light text-white/62">
          {m.body}
        </p>
      </div>
      <div className="border-t border-border lg:border-t-0 lg:border-l">
        <Demo className="h-full rounded-none border-0 bg-transparent" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-10">
      <header className="mb-14">
        <span className="font-mono text-[11px] tracking-[0.2em] text-white/34 uppercase">
          Throwaway
        </span>
        <h1 className="mt-3 text-[clamp(28px,3.4vw,44px)] leading-[1.06] tracking-[-0.035em]">
          Control section — card treatments
        </h1>
        <p className="mt-4 max-w-[64ch] text-[15px] leading-[1.6] font-light text-white/55">
          Same three mechanisms, same live demos, four different cards around
          them. The current section is the first one, for comparison.
        </p>
      </header>

      <div className="flex flex-col gap-20">
        <Lane
          n="00"
          name="Current"
          note="Icon, heading, paragraph, dot-separated tags — the shape you flagged."
        >
          <div className="grid gap-4.5 lg:grid-cols-3">
            {MECHANISMS.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.n}
                  className="flex flex-col rounded-2xl border border-input bg-accent px-7 py-7.5"
                >
                  <Icon
                    weight="light"
                    className="mb-auto size-6.75 text-white/80"
                    aria-hidden
                  />
                  <h3 className="mt-8 mb-3 text-[22px] leading-[1.2] tracking-tight">
                    {m.title}
                  </h3>
                  <p className="text-sm leading-[1.6] font-light text-white/68">
                    {m.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2.5 pt-5.5 font-mono text-[11.5px] text-white/40">
                    {m.tags.join(" · ")}
                  </div>
                </div>
              );
            })}
          </div>
        </Lane>

        <Lane
          n="A"
          name="Spec sheet"
          note="No icon, no prose. A rule, a name, a claim set large, and three label/value rows — the same instrument language as the tool readout and the notch specs."
        >
          <div className="grid gap-x-4.5 gap-y-12 lg:grid-cols-3">
            {MECHANISMS.map((m) => (
              <SpecCard key={m.n} m={m} />
            ))}
          </div>
        </Lane>

        <Lane
          n="B"
          name="Editorial"
          note="Typography carries it. A ghosted numeral behind, the claim at display size, the body hung off a rule. No box at all — the section's ground shows through."
        >
          <div className="grid gap-x-4.5 gap-y-14 lg:grid-cols-3">
            {MECHANISMS.map((m) => (
              <EditorialCard key={m.n} m={m} />
            ))}
          </div>
        </Lane>

        <Lane
          n="C"
          name="Plate"
          note="Hardware rather than web card: a tight radius, an inner scribe line, an engraved label, a count. Tags become etched chips instead of a dot-separated run."
        >
          <div className="grid gap-4.5 lg:grid-cols-3">
            {MECHANISMS.map((m) => (
              <PlateCard key={m.n} m={m} />
            ))}
          </div>
        </Lane>

        <Lane
          n="D"
          name="One card per mechanism"
          note="Three wide cards instead of six cells. The claim and the thing you can press live in the same frame, split by a hairline — which is the fix for the fragmentation as much as any styling is."
        >
          <div className="flex flex-col gap-4.5">
            {MECHANISMS.map((m, i) => (
              <PairedRow key={m.n} m={m} i={i} />
            ))}
          </div>
        </Lane>
      </div>
    </main>
  );
}
