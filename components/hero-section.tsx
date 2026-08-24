"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import heroWall from "@/public/assets/hero-wall.jpg";
import { AppleLogo } from "@/components/apple-logo";
import { DownloadButton, GhostButton } from "@/components/cta-button";
import { RovykHud } from "@/components/rovyk-hud";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const APPS = [
  "Mail",
  "Calendar",
  "Finder",
  "Safari",
  "Xcode",
  "Slack",
  "Notion",
  "GitHub",
  "Figma",
  "Spotify",
  "Terminal",
  "Notes",
];

/** Facts, not claims — every one of these is checkable before downloading. */
const SPECS = ["macOS 27+", "Apple Silicon", "84 MB"];

const MENUS = ["File", "Edit", "View", "Window", "Help"];

/** Deterministic so the server and client agree — a seeded PRNG rather than
 *  Math.random, which would mismatch on hydration and flash. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rand = mulberry32(0x0176);
  return Array.from({ length: 130 }, () => {
    const size = rand() < 0.86 ? 0.9 + rand() * 0.7 : 1.8 + rand() * 1.3;
    return {
      left: `${(rand() * 100).toFixed(2)}%`,
      top: `${(rand() * 100).toFixed(2)}%`,
      size: `${size.toFixed(1)}px`,
      opacity: (0.1 + rand() * 0.45).toFixed(2),
      duration: `${(3 + rand() * 6).toFixed(1)}s`,
      delay: `${(rand() * 8).toFixed(1)}s`,
    };
  });
})();

export function HeroSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      /* The copy rises as the section arrives. Triggered on scroll rather
         than on mount, because the intro sits above this — by the time
         anyone gets here the element has been in the DOM for a while. */
      gsap.from(q("[data-rise]"), {
        y: 26,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
      });

      /* The window comes up from further down and settles later, so the
         section assembles front-to-back instead of all at once. */
      gsap.from(q("[data-display]"), {
        y: 64,
        autoAlpha: 0,
        duration: 1.15,
        ease: "power3.out",
        delay: 0.22,
        scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative z-10 flex min-h-[calc(100svh-var(--gut)*2)] flex-col items-center overflow-hidden rounded-t-4xl border-t border-border bg-background"
    >
      {/* The wallpaper the whole section is lit by. Statically imported so
          Next infers its dimensions and generates the blur placeholder;
          `priority` because it is the largest paint above the fold. Framed
          at 42% rather than centre — that is where the horizon sits. */}
      <Image
        src={heroWall}
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        placeholder="blur"
        className="object-cover object-[center_42%]"
      />
      <div className="bg-hero-scrim absolute inset-0" />
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay" />

      {/* Starfield. Decorative — it gives the void depth so the window has
          something to sit in front of. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
      >
        {STARS.map((star, i) => (
          <span
            key={i}
            className="animate-twinkle absolute rounded-full bg-white"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDuration: star.duration,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* ── Copy ───────────────────────────────────────────────────── */}
      <div className="relative z-20 flex w-full max-w-280 flex-col items-center px-6 pt-[clamp(74px,9.5vh,124px)] text-center sm:px-10">
        <div
          data-rise
          className="mb-5 inline-flex items-center gap-2 text-[12.5px] text-muted-foreground"
        >
          <span className="text-white/36">[</span>
          Voice agent for macOS
          <span className="text-white/36">]</span>
        </div>

        <h1
          data-rise
          className="max-w-[16ch] text-[clamp(40px,5.4vw,72px)] leading-[1.04] font-medium tracking-[-0.035em]"
        >
          Talk to your Mac.
          <br />
          <span className="text-white/46">Watch it work.</span>
        </h1>

        <p
          data-rise
          className="mt-5 max-w-[58ch] text-[clamp(15px,1.25vw,17px)] leading-[1.62] font-light tracking-[-0.004em] text-muted-foreground"
        >
          Rovyk lives in the notch and operates your machine. Apps, files, mail,
          calendar and the web. It hears, thinks and speaks on-device.
        </p>

        <div data-rise className="mt-7 flex flex-wrap justify-center gap-3">
          <DownloadButton href="#cta">Download for Mac</DownloadButton>
        </div>

        <div data-rise className="mt-4 flex gap-4 text-xs text-white/60">
          {SPECS.map((spec) => (
            <span key={spec}>{spec}</span>
          ))}
        </div>
      </div>

      {/* ── The machine ────────────────────────────────────────────────
          Cropped rather than framed: the window runs off the bottom of the
          section, so it reads as a real screen the page is sitting on top
          of instead of a screenshot in a box. */}
      <div
        data-display
        className="mask-fade-b relative z-20 mt-[clamp(22px,3.2vh,46px)] flex max-h-[48vh] min-h-47.5 w-full flex-1 justify-center overflow-hidden"
      >
        <div className="relative aspect-16/10 w-[min(1080px,86vw)] overflow-hidden rounded-3xl bg-background shadow-[0_0_0_1px_rgba(255,255,255,.18),0_0_0_6px_rgba(255,255,255,.035),0_40px_90px_-30px_rgba(0,0,0,.9)]">
          <div className="bg-display-wall absolute inset-0" />

          {/* Menu bar — the notch hangs from this edge. */}
          <div className="absolute inset-x-0 top-0 z-20 flex h-7 items-center justify-between px-3.5 text-[11px] text-white/74 backdrop-blur-lg [background:linear-gradient(180deg,rgba(0,0,0,.38),rgba(0,0,0,.06))]">
            {/* The notch takes most of the bar's width once it is scaled to
                a phone-sized window, so the chrome around it thins out
                rather than colliding with it. */}
            <div className="flex items-center gap-4">
              <AppleLogo size={13} className="text-white/90" />
              <b className="hidden font-semibold sm:inline">Rovyk</b>
              {MENUS.map((menu) => (
                <span key={menu} className="hidden lg:inline">
                  {menu}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">Tue 18 Aug</span>
              <span>9:41</span>
            </div>
          </div>

          {/* Scaled to the window: expanded the notch is 404px, wider than
              the whole machine at phone sizes. */}
          <RovykHud className="scale-[0.52] sm:scale-[0.8] lg:scale-100" />
        </div>
      </div>

      {/* ── App marquee ────────────────────────────────────────────────
          The claim the marquee is making is scope: it drives apps that
          never integrated with it. Names only, no logos — we are not
          implying partnerships. */}
      <div className="absolute bottom-0 left-1/2 z-30 flex -translate-x-1/2 items-end">
        <span className="mask-fillet-bl -mr-px size-6.5 shrink-0 bg-background" />
        <div className="relative flex h-14.5 w-[min(480px,54vw)] items-center overflow-hidden rounded-t-3xl bg-background">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-18 bg-linear-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-18 bg-linear-to-l from-background to-transparent" />
          <div className="animate-marquee flex w-max items-center gap-9.5 pl-5 motion-reduce:animate-none">
            {/* Three passes: the keyframe travels exactly one third, so the
                loop point lands on an identical frame. */}
            {[0, 1, 2].map((pass) => (
              <div
                key={pass}
                className="flex items-center gap-9.5"
                aria-hidden={pass > 0}
              >
                {APPS.map((app) => (
                  <span
                    key={app}
                    className="text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap text-white/60"
                  >
                    {app}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="mask-fillet-br -ml-px size-6.5 shrink-0 bg-background" />
      </div>
    </section>
  );
}
