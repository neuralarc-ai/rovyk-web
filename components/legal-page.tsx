import { LegalNav } from "@/components/legal-nav";
import { SiteFooter } from "@/components/site-footer";
import type { LegalBlock, LegalDoc } from "@/lib/legal";

/* ────────────────────────────────────────────────────────────────────
   The frame both legal documents are set in.

   Same sheet as the home page — inset by `--gut`, rounded, footer
   inside it — so arriving here from the footer does not feel like
   leaving the site. What changes is the density: no full-bleed
   sections, one measure, and every claim set the way the rest of the
   page sets a claim it wants checked.

   Numbered sections with a contents column beside them, because these
   are documents people arrive at looking for one clause rather than
   reading front to back. The number is the address: "section 12" has
   to mean something for a term to be citable.
   ──────────────────────────────────────────────────────────────────── */

function Block({ block }: { block: LegalBlock }) {
  if ("p" in block)
    return (
      <p className="max-w-[68ch] text-[15px] leading-[1.72] font-light text-white/68">
        {block.p}
      </p>
    );

  if ("list" in block)
    return (
      <ul className="flex max-w-[68ch] flex-col gap-2.5">
        {block.list.map((item) => (
          <li
            key={item}
            className="relative pl-6 text-[15px] leading-[1.72] font-light text-white/68"
          >
            {/* A hairline rather than a bullet — the same mark the rail and
                the orb beats use, so a list here is visibly the same page. */}
            <span
              aria-hidden
              className="absolute top-[0.82em] left-0 h-px w-3 bg-white/25"
            />
            {item}
          </li>
        ))}
      </ul>
    );

  if ("rows" in block)
    return (
      <dl className="max-w-[72ch]">
        {block.rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 border-t border-border py-3 sm:flex-row sm:items-baseline sm:gap-6"
          >
            <dt className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-white/34 uppercase sm:w-[142px]">
              {label}
            </dt>
            <dd className="text-[14px] leading-[1.6] font-light text-white/85">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    );

  /* The clause above, said out loud. A page whose whole argument is that
     it does not hide things should be willing to restate the ones that
     matter in the words it would use in an email. */
  return (
    <div className="max-w-[68ch] rounded-xl border border-border bg-card/60 px-5 py-4.5">
      <span className="mb-2 block font-mono text-[10px] tracking-[0.16em] text-white/34 uppercase">
        In plain terms
      </span>
      <p className="text-[14.5px] leading-[1.6] text-white/82">{block.note}</p>
    </div>
  );
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="relative m-(--gut) rounded-4xl bg-background">
      <main>
        {/* ── The head ──────────────────────────────────────────────
            The grid blooms out of the top edge and is gone before the
            first clause, so the document starts on a surface with a
            texture and reads on one without. */}
        <header className="relative overflow-hidden rounded-t-4xl border-b border-border">
          <div
            aria-hidden
            className="bg-hairline-grid mask-grid-top pointer-events-none absolute inset-0 [--grid-size:150px]"
          />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-[clamp(112px,16vh,180px)] pb-14 sm:px-10">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.16em] text-white/40 uppercase">
              <span className="text-white/22">[</span>
              {doc.eyebrow}
              <span className="text-white/22">]</span>
            </span>

            <h1 className="mt-5 max-w-[19ch] text-[clamp(34px,4.6vw,62px)] leading-[1.04] font-medium tracking-[-0.035em] text-balance">
              {doc.title}
            </h1>

            <p className="mt-6 max-w-[58ch] text-[clamp(15px,1.25vw,17px)] leading-[1.62] font-light text-white/60">
              {doc.lede}
            </p>

            <div className="mt-9 flex items-baseline gap-3 font-mono text-[10.5px] tracking-[0.16em] text-white/34 uppercase">
              <span>Last updated</span>
              <span className="text-white/60">{doc.updated}</span>
            </div>
          </div>
        </header>

        {/* ── The document ──────────────────────────────────────────── */}
        <div className="mx-auto w-full max-w-7xl px-6 pt-16 pb-[clamp(96px,12vh,140px)] sm:px-10">
          <div className="grid gap-x-16 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <LegalNav
              items={doc.sections.map(({ id, title }) => ({ id, title }))}
            />

            <div className="flex flex-col">
              {doc.sections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 border-t border-border pt-10 pb-12 first:border-t-0 first:pt-0 lg:first:pt-1"
                >
                  <h2 className="mb-6 flex items-baseline gap-4">
                    <span className="font-mono text-[11px] tracking-[0.16em] text-white/30 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[clamp(20px,2vw,26px)] leading-[1.2] font-medium tracking-[-0.03em] text-white">
                      {section.title}
                    </span>
                  </h2>

                  <div className="flex flex-col gap-5">
                    {section.blocks.map((block, j) => (
                      <Block key={j} block={block} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
