import { HeroSection } from "@/components/hero-section";
import { IntroSection } from "@/components/intro-section";

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
      </main>
    </>
  );
}
