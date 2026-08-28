import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNotchNav } from "@/components/landing/landing-notch-nav";

export default function Page() {
  return (
    <>
      <LandingNotchNav />
      <main className="relative m-(--gut) rounded-4xl bg-background">
        <LandingHero />
        <p className="pb-24 text-center text-sm text-white/40">
          Landing page under construction.
        </p>
      </main>
    </>
  );
}
