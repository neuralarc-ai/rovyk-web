import { DownloadButton, GhostButton } from "@/components/cta-button";
import { HeroOrb } from "@/components/hero-orb";

/* ────────────────────────────────────────────────────────────────────
   The close — the same offer the hero made, after the argument.

   No eyebrow and no section head. Every other section on this page
   opens by naming itself, because each is answering a different
   question; this one is not asking anything, and a bracketed label
   above it would file the ask as one more topic rather than the end of
   the page.

   The orb comes back at the size it was in the notch, which is the
   only callback the section makes. It is listening rather than
   working: the line is "say it once", and an orb mid-task at the
   moment of asking would be answering a question nobody has put to it
   yet.

   Everything is centred and the measure is deliberately tight — 38ch,
   narrower than any body copy above — so the last thing read is one
   line wide and unmissable.
   ──────────────────────────────────────────────────────────────────── */

/** The three numbers worth knowing before clicking. Same facts the hero
 *  opened with, so nothing new is introduced at the point of decision. */
const META = ["v0.9", "84 MB", "macOS 27+"];

export function CtaSection() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden py-[calc(var(--section-y)*1.2)]"
    >
      {/* A single soft bloom behind the orb, lifted from 40% rather than
          centred, so the light lands on the orb and the headline and falls
          off before the buttons. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(46%_52%_at_50%_40%,rgba(255,255,255,.06),transparent_72%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 text-center sm:px-10">
        <HeroOrb state="composing" size={240} className="mb-8" />

        <h2 className="text-[clamp(34px,4.6vw,62px)] leading-[1.04] font-medium tracking-[-0.035em]">
          Say it once.
        </h2>

        <p className="mt-5 max-w-[38ch] text-[16.5px] leading-[1.6] font-light tracking-[-0.004em] text-muted-foreground">
          Your Mac has been waiting for a better interface than the mouse.
        </p>

        <div className="mt-7.5 flex flex-wrap justify-center gap-3">
          <DownloadButton>Download for Apple Silicon</DownloadButton>
        </div>
      </div>
    </section>
  );
}
