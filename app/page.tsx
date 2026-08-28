import { LandingAction } from "@/components/landing/landing-action";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";
import { LandingVideo } from "@/components/landing/landing-video";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <main className="relative m-(--gut) rounded-4xl bg-background">
        <LandingHero />
        <LandingVideo />
        <LandingAction />
        <LandingFeatures />
        <p className="pb-24 text-center text-sm text-white/40">
          Landing page under construction.
        </p>
      </main>
    </>
  );
}
