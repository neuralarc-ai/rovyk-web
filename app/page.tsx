import { ApartSection } from "@/components/apart-section";
import { ControlSection } from "@/components/control-section";
import { CtaSection } from "@/components/cta-section";
import { FaqSection } from "@/components/faq-section";
import { HeroSection } from "@/components/hero-section";
import { HowSection } from "@/components/how-section";
import { IntroSection } from "@/components/intro-section";
import { OrbSection } from "@/components/orb-section";
import { RequirementsSection } from "@/components/requirements-section";
import { SiteFooter } from "@/components/site-footer";
import { SurfacesSection } from "@/components/surfaces-section";
import { ToolsSection } from "@/components/tools-section";

export default function Page() {
  return (
    <>
      {/* Full-bleed: the splash owns the whole screen, outside the frame. */}
      <IntroSection />

      {/* The sheet. Every section from here on shares one rounded surface,
          inset by the same `--gut` the bezel strips are drawn at; the first
          section carries the top corners and the footer the bottom ones.

          The sheet is a plain div rather than the `<main>` itself, so the
          footer can sit inside the frame visually while still being the
          page's `contentinfo` landmark rather than a block buried in the
          main content. */}
      <div className="relative m-(--gut) rounded-4xl bg-background">
        <main>
          <HeroSection />
          <SurfacesSection />
          <ToolsSection />
          <HowSection />
          <OrbSection />
          <ApartSection />
          <ControlSection />
          <RequirementsSection />
          <FaqSection />
          <CtaSection />
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
