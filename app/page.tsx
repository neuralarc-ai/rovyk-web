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
        <p className="pt-10 pb-24 text-center text-sm text-white/40">
          Landing page under construction.
        </p>
      </main>
    </>
  );
}
