"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowCounterClockwiseIcon,
  CornersOutIcon,
  PlayIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import heroWall from "@/public/assets/hero-wall-2.jpg";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The page's dominant element: a clip of the product in use, played
   once.

   It asks to start with its sound on, which is a request browsers are
   free to refuse — autoplay with audio is only granted to sites the
   visitor has played media on before. So the start is a two-step: try it
   loud, and if that is turned down, come back muted rather than not at
   all. Either way the element, not our intent, is what the controls read
   their state off.

   The mark in the middle is a play button and nothing else: it is there
   when the clip is stopped and gone when it runs, so it is only ever
   offering the one thing that is possible. There is no pause button —
   the frame is the pause button, and a running video needs no furniture
   over it to say so. At the end the mark returns as a replay, since the
   clip stops rather than looping.

   The exception is the phone, where the frame is a few hundred pixels
   wide and a UI demo that small is a rumour. The corner carries a second
   button there, opening the clip in a dialog rather than calling
   `requestFullscreen`: that API takes the whole browser window with it,
   and only exists on some of the devices that need this — an iPhone has
   no element fullscreen at all, only the native player.
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
  const [ended, setEnded] = useState(false);
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
      setEnded(el.ended);
      setMuted(el.muted);
    };
    read();

    el.addEventListener("play", read);
    el.addEventListener("pause", read);
    el.addEventListener("ended", read);
    el.addEventListener("volumechange", read);

    /* Someone who asked for less motion did not ask for this either, so
       it holds on the poster until they press play — which is exactly
       what a stopped clip already shows a button for. */
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
      el.removeEventListener("ended", read);
      el.removeEventListener("volumechange", read);
    };
  }, []);

  /* Watched rather than read once — same reasoning as the nav: a tablet
     with a keyboard folded on can change its answer mid-session. Only
     the dialog hangs off this; a pointer has the full-width frame
     already, and nothing to gain from one. */
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

  /* The whole interaction, and the same one whether it arrives on the
     mark or anywhere else on the frame: stop it, start it, or start it
     over. */
  const press = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.ended) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
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
            imperatively above, where the browser's answer is visible.
            No `loop` either: it plays once and offers a replay. */}
        <video
          ref={ref}
          src={SRC}
          poster={heroWall.src}
          playsInline
          preload="metadata"
          aria-label="Rovyk in use"
          className="absolute inset-0 size-full object-cover"
        />

        {/* Enough shadow under the corner for the marks to stay legible
            over a bright frame, and nothing more. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/30 to-transparent"
        />

        {/* The frame itself, as a surface to press — this is the pause
            button. Hidden from assistive tech and out of the tab order
            on purpose: it is a second way to reach the button below, not
            a second control, and a keyboard already has that one. */}
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={press}
          className="absolute inset-0 cursor-pointer"
        />

        {/* The wrapper never takes a click — it is full-bleed, and
            anything it caught would be a click the frame below needed.
            Only the mark is pressable, and only while the clip is
            stopped; while it runs there is nothing here to press. */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-black/30 grid place-items-center transition-opacity duration-300 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
            playing ? "opacity-0" : "opacity-100",
          )}
        >
          <button
            type="button"
            onClick={press}
            aria-label={ended ? "Play the video again" : "Play the video"}
            className={cn(
              "grid size-16 cursor-pointer place-items-center rounded-full border border-white/25 bg-black/30 text-white/85 backdrop-blur-sm transition-colors duration-200 hover:border-white/45 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:size-20",
              !playing && "pointer-events-auto",
            )}
          >
            {ended ? (
              <ArrowCounterClockwiseIcon
                className="size-6 sm:size-7"
                aria-hidden
              />
            ) : (
              <PlayIcon
                weight="fill"
                className="size-6 sm:size-7"
                aria-hidden
              />
            )}
          </button>
        </div>

        <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-75 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 sm:right-5 sm:bottom-5">
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

          {/* Touch only, and the only way into the dialog now that a tap
              on the frame plays or pauses. */}
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
