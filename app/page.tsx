import { IntroSection } from "@/components/intro-section";
import { SmoothScroll } from "@/components/smooth-scroll";

export default function Page() {
  return (
    <SmoothScroll>
      <IntroSection />
      {/* Scaffolding only — gives the scroll cue somewhere to go until the
          next section is built. No content is implied here. */}
      <section className="h-screen border-t border-border bg-background" />
    </SmoothScroll>
  );
}
