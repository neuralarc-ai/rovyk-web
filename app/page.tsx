import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";
import { LandingSpecs } from "@/components/landing/landing-specs";
import { LandingVideo } from "@/components/landing/landing-video";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <div className="relative m-(--gut) rounded-4xl bg-background">
        <main>
          <LandingHero />
          <LandingVideo />
          <LandingFeatures />
          <LandingSpecs />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
