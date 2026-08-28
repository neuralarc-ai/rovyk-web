/**
 * The landing page's opening beat: the product's name, said once more
 * than the nav already said it, then room to breathe before the video
 * — the video is the page's actual argument, this is just the title
 * card in front of it.
 */
export function LandingHero() {
  return (
    <div className="flex flex-col items-center px-6 pt-[clamp(64px,9vh,108px)] pb-[clamp(32px,4.5vh,56px)] text-center sm:px-10">
      <h1 className="text-[clamp(34px,5vw,58px)] leading-[1.05] font-medium tracking-[-0.035em]">
        Rovyk for macOS
      </h1>
      <p className="mt-4 max-w-[46ch] text-[clamp(15px,1.2vw,17px)] leading-[1.6] font-light tracking-[-0.004em] text-muted-foreground">
        Talk to your Mac. Watch it work.
      </p>
    </div>
  );
}
