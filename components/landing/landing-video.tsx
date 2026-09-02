"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  CornersOutIcon,
  PauseIcon,
  PlayIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  XIcon,
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

   Three controls and a line of progress. No scrubber and no timeline —
   those advertise something to sit and watch, and this is a loop you
   glance at.

   The exception is the phone, where the frame is a few hundred pixels
   wide and a UI demo that small is a rumour. Tapping opens the clip in a
   dialog rather than calling `requestFullscreen`: that API takes the
   whole browser window with it, and only exists on some of the devices
   that need this — an iPhone has no element fullscreen at all, only the
   native player. The dialog behaves the same everywhere, and its video
   carries the system's own controls, whose fullscreen button is there
   for anyone who does want the screen.
   ──────────────────────────────────────────────────────────────────── */

const SRC = "https://dryb6003xlide.cloudfront.net/rovyk-hero.mp4";

const BUTTON =
  "grid size-9 cursor-pointer place-items-center rounded-full border border-white/25 bg-black/35 text-white/70 backdrop-blur-sm transition-colors duration-200 hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const POINTER = "(hover: hover) and (pointer: fine)";

export function LandingVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const big = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  /* Where the inline clip had got to when the dialog took over, and
     where the dialog had got to when it handed back. */
  const at = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [touch, setTouch] = useState(false);

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

  /* Watched rather than read once — same reasoning as the nav: a tablet
     with a keyboard folded on can change its answer mid-session. The
     whole control hangs off this, target and button both: a pointer has
     the full-width frame already, and nothing to gain from a dialog. */
  useEffect(() => {
    const mq = matchMedia(POINTER);
    const read = () => setTouch(!mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
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

  /* One file, two elements, and the timestamp is the handoff between
     them — the dialog picks the clip up where the frame left it, and
     hands it back the same way on the way out. The frame is paused
     throughout: two copies of a 140MB video decoding at once is a phone
     getting warm for no reason. */
  const enlarge = useCallback(() => {
    const el = ref.current;
    if (el) {
      at.current = el.currentTime;
      el.pause();
    }
    setOpen(true);
  }, []);

  const change = useCallback((next: boolean) => {
    if (!next) {
      const el = ref.current;
      if (el) {
        if (big.current) el.currentTime = big.current.currentTime;
        el.play().catch(() => {});
      }
    }
    setOpen(next);
  }, []);

  return (
    <div className="flex justify-center px-6 sm:px-10">
      {/* The 78vw cap is breathing room on a desktop, where there is room
          to give away. On a phone it was taking a frame already inside
          page padding and shaving another fifth off it. */}
      <div className="group relative aspect-16/9 w-full max-w-full overflow-hidden rounded-3xl bg-background shadow-[0_0_0_1px_rgba(255,255,255,.18),0_0_0_6px_rgba(255,255,255,.035),0_40px_90px_-30px_rgba(0,0,0,.9)] sm:max-w-[min(1100px,78vw)]">
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

        {/* A thumb is not a cursor: on touch the whole frame opens it,
            because a 36px circle in a corner is not what anyone aims at
            first. Pointer devices keep the frame inert and use the
            button, which is also the only version a keyboard can reach. */}
        {touch ? (
          <button
            type="button"
            onClick={enlarge}
            aria-label="Open the video larger"
            className="absolute inset-0 cursor-pointer"
          />
        ) : null}

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

          {/* The visible half of the same control: the frame behind it
              opens the dialog too, but nothing says so, and a keyboard
              cannot press a bare tap target. */}
          {touch ? (
            <button
              type="button"
              onClick={enlarge}
              aria-label="Open the video larger"
              className={BUTTON}
            >
              <CornersOutIcon className="size-4" aria-hidden />
            </button>
          ) : null}
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

      {/* Portalled, which is the point of using the same Dialog the
          waitlist does: the sheet this sits in sets a stacking context,
          and an in-tree overlay would come out underneath the notch nav.
          Base UI brings the focus trap, Escape and the backdrop click
          with it. */}
      <Dialog.Root open={open} onOpenChange={change}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-200 bg-black/88 backdrop-blur-sm transition-opacity duration-250 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />

          <Dialog.Popup className="fixed top-1/2 left-1/2 z-200 w-[calc(100vw-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2">
            <Dialog.Title className="sr-only">Rovyk in use</Dialog.Title>

            {/* Native controls, deliberately: in a dialog there is room
                for a scrubber, and the system player is also where the
                fullscreen and AirPlay buttons live — better versions of
                both than we would write. */}
            <video
              ref={big}
              src={SRC}
              poster={heroWall.src}
              autoPlay
              controls
              loop
              playsInline
              onLoadedMetadata={(e) => {
                e.currentTarget.currentTime = at.current;
              }}
              className="aspect-16/9 w-full rounded-2xl bg-black"
            />

            <Dialog.Close
              aria-label="Close the video"
              className="absolute -top-11 right-0 grid size-9 cursor-pointer place-items-center rounded-full border border-white/25 bg-white/8 text-white/70 transition-colors duration-200 hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <XIcon className="size-4" aria-hidden />
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
