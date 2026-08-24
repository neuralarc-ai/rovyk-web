import { ApartSection } from "@/components/apart-section";
import { ControlSection } from "@/components/control-section";
import { HeroSection } from "@/components/hero-section";
import { HowSection } from "@/components/how-section";
import { IntroSection } from "@/components/intro-section";
import { OrbSection } from "@/components/orb-section";
import { SurfacesSection } from "@/components/surfaces-section";
import { ToolsSection } from "@/components/tools-section";

export default function Page() {
  return (
    <>
      {/* Full-bleed: the splash owns the whole screen, outside the frame. */}
      <IntroSection />

      {/* The sheet. Every section from here on shares one rounded surface,
          inset by the same `--gut` the bezel strips are drawn at; the first
          section carries the top corners. */}
      <main className="relative m-(--gut) rounded-4xl bg-background">
        <HeroSection />
        <SurfacesSection />
        <ToolsSection />
        <HowSection />
        <OrbSection />
        <ApartSection />
        <ControlSection />
      </main>
    </>
  );
}
