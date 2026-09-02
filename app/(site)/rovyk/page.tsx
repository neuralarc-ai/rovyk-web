import type { Metadata } from "next";
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
import { VoiceHud } from "@/components/voice/voice-hud";
import { VoiceProvider } from "@/components/voice/voice-provider";
import { VOICE_MODE } from "@/lib/flags";
import { ToolsSection } from "@/components/tools-section";

export const metadata: Metadata = {
  alternates: { canonical: "/rovyk" },
  title: "Rovyk: voice agent for macOS",
  description:
    "Talk to your Mac and watch it work. Rovyk lives in the menu bar and operates your machine. Local by default.",
};

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
        {/* The sheet's own surface, spelled out again so it can travel.

            Under `reveal:` the footer stops being the last block on the
            sheet and becomes the thing the sheet is lying on top of, so
            main needs an opaque ground of its own to hide it with, its own
            top corners (the sheet's are behind it now), and a layer above
            it. The hairline moves here too: on the footer it sat at a fixed
            point on the screen and popped into view mid-reveal, whereas on
            this edge it is the sheet's departing edge and travels with it. */}
        <main className="reveal:relative reveal:z-10 reveal:rounded-t-4xl reveal:border-b reveal:border-input reveal:bg-background">
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

      {/* Voice mode. Mounted last and fixed to the frame, so it hangs off
          the page's chrome rather than sitting inside the sheet. Silent
          and inert until the visitor presses the dock.

          Behind a flag, and not mounted at all when it is off: the whole
          feature is a provider, a frame loop and an audio element, none
          of which should exist on a build that has not asked for them. */}
      {VOICE_MODE ? (
        <VoiceProvider>
          <VoiceHud />
        </VoiceProvider>
      ) : null}
    </>
  );
}
