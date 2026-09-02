"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PauseIcon,
  PlayIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import heroWall from "@/public/assets/hero-wall-2.jpg";

/* ────────────────────────────────────────────────────────────────────
   The page's dominant element: a looping clip of the product in use.

   It asks to start with its sound on, which is a request browsers are
   free to refuse — autoplay with audio is only granted to sites the
   visitor has played media on before. So the start is a two-step: try it
   loud, and if that is turned down, come back muted rather than not at
   all. Either way the element, not our intent, is what the controls read
   their state off; a "pause" button over a video that never started is
   worse than no button.

   Two controls and a line of progress. No scrubber, no timeline, no
   duration — those advertise something to sit and watch, and this is a
   loop you glance at.
   ──────────────────────────────────────────────────────────────────── */

const SRC = "https://dryb6003xlide.cloudfront.net/rovyk-hero.mp4";

const BUTTON =
  "grid size-9 cursor-pointer place-items-center rounded-full border border-white/25 bg-black/35 text-white/70 backdrop-blur-sm transition-colors duration-200 hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function LandingVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  /* The element is the source of truth; we only mirror it. `read` runs
     once on mount too, to catch a play or a pause that landed before
     React attached the listeners. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = () => {
      setPlaying(!el.paused);
      setMuted(el.muted);
    };
    read();

    el.addEventListener("play", read);
    el.addEventListener("pause", read);
    el.addEventListener("volumechange", read);

    /* Someone who asked for less motion did not ask for this either, so
       it holds on the poster until they press play. */
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.play().catch(() => {
        /* Refused with sound. Muted is the version every browser
           allows, and the speaker button is now worth pressing. */
        el.muted = true;
        el.play().catch(() => {});
      });
    }

    return () => {
      el.removeEventListener("play", read);
      el.removeEventListener("pause", read);
      el.removeEventListener("volumechange", read);
    };
  }, []);

  /* Progress is written straight to the node on a frame loop rather than
     held in state: at 60fps a `setState` per frame would re-render the
     whole hero to move a hairline. The loop only runs while the video
     does, and one last write on the way out leaves the line truthful
     wherever it stopped. */
  useEffect(() => {
    const el = ref.current;
    const line = bar.current;
    if (!el || !line) return;

    const draw = () => {
      const total = el.duration;
      const done =
        total > 0 && Number.isFinite(total) ? el.currentTime / total : 0;
      line.style.transform = `scaleX(${done})`;
    };
    draw();
    if (!playing) return;

    let frame = requestAnimationFrame(function tick() {
      draw();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const togglePlay = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    /* A rejected `play()` is a refusal we can do nothing about — the
       paused state it leaves behind is already the honest one. */
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const toggleSound = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
  }, []);

  return (
    <div className="flex justify-center px-6 sm:px-10">
      <div
        className="group relative aspect-16/9 w-full overflow-hidden rounded-3xl bg-background shadow-[0_0_0_1px_rgba(255,255,255,.18),0_0_0_6px_rgba(255,255,255,.035),0_40px_90px_-30px_rgba(0,0,0,.9)]"
        style={{ maxWidth: "min(1100px, 78vw)" }}
      >
        {/* No `muted` prop: React does not render that attribute on the
            server, so the value would flip on hydration. Sound is set
            imperatively above, where the browser's answer is visible. */}
        <video
          ref={ref}
          src={SRC}
          poster={heroWall.src}
          loop
          playsInline
          preload="metadata"
          aria-label="Rovyk in use"
          className="absolute inset-0 size-full object-cover"
        />

        {/* Enough shadow under the corner for the marks to stay legible
            over a bright frame, and nothing more. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent"
        />

        <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-75 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 sm:right-5 sm:bottom-5">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause the video" : "Play the video"}
            className={BUTTON}
          >
            {playing ? (
              <PauseIcon weight="fill" className="size-3.5" aria-hidden />
            ) : (
              <PlayIcon
                weight="fill"
                className="size-3.5 translate-x-px"
                aria-hidden
              />
            )}
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? "Unmute the video" : "Mute the video"}
            className={BUTTON}
          >
            {muted ? (
              <SpeakerSlashIcon className="size-4" aria-hidden />
            ) : (
              <SpeakerHighIcon className="size-4" aria-hidden />
            )}
          </button>
        </div>

        {/* A hairline on the bottom edge — how far through, and nothing
            else. Decorative on purpose: it is the same fact the video
            already tells anyone who can see it, and there is nothing to
            press. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/15"
        >
          {/* Scaled through `transform`, and deliberately not through the
              `scale-x-*` utilities: Tailwind v4 sets the standalone
              `scale` property, which multiplies with whatever transform
              the frame loop writes — a class of `scale-x-0` would hold
              the line at nothing forever. */}
          <span
            ref={bar}
            style={{ transform: "scaleX(0)" }}
            className="block h-full origin-left bg-white/85 will-change-transform"
          />
        </div>
      </div>
    </div>
  );
}
