"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { VoicePlayer } from "@/components/voice/voice-player";
import { takeFloor } from "@/lib/voice-floor";
import {
  VOICE_SECTIONS,
  sectionAtLine,
  trackFor,
  type VoiceSection,
  type VoiceTrack,
} from "@/lib/voice-script";

gsap.registerPlugin(ScrollTrigger);

/* ────────────────────────────────────────────────────────────────────
   The conductor: what speaks, and when.

   ── The rule everything else follows ─────────────────────────────
   **A track that has started plays to its end.** Scrolling never cuts
   it off. Only the visitor stopping it does.

   This is not politeness, it is arithmetic. A section is the live one
   only for the scroll distance between its top and the next section's,
   which on `/rovyk` is 890 to 1600 pixels for most of them. A slow,
   deliberate read moves about 73 pixels a second, and a steady scroll
   227 — both measured through Lenis rather than guessed. So a fifteen
   second brief would need a reader travelling under 60px/s to survive,
   which nobody is. Section-bounded playback means every visitor hears
   fragments.

   Letting the track own itself fixes that, and reads better besides: an
   assistant that stops mid-sentence because you looked away is worse
   than one that finishes its thought. The conductor's job is therefore
   not "keep up with the scroll" but "decide what to say next, once the
   last thing is said".

   ── What that leaves ─────────────────────────────────────────────
   - Nothing at all until the visitor wakes it. Sound is a gesture.
   - Idle and settled somewhere unheard → say the brief.
   - Track ends, still in the same section → say the dwell, if there is
     one. This is why `dwell` is rare rather than broken: it needs a
     reader who actually stopped.
   - Track ends somewhere new → settle again, then speak.
   - Anything crossed while a track was playing counts as heard. There
     is no queue and there is never a backlog to work through.
   ──────────────────────────────────────────────────────────────────── */

/** How long the visitor has to be in a section before it is addressed.
 *  Long enough that scrolling past four of them says nothing at all. */
const SETTLE_MS = 1200;

/** Where a section counts as the live one — the same 40% line the nav's
 *  index reads, so the two never disagree about where you are. */
const LINE = "40%";

type VoiceContext = {
  awake: boolean;
  /** The section the conductor believes you are in, or null. */
  section: VoiceSection | null;
  /** The track being spoken, or null when silent. */
  speaking: VoiceTrack | null;
  player: VoicePlayer;
  wake: () => void;
  sleep: () => void;
  toggle: () => void;
};

const Context = createContext<VoiceContext | null>(null);

export function useVoice(): VoiceContext {
  const context = useContext(Context);
  if (!context) throw new Error("useVoice must be used inside <VoiceProvider>.");
  return context;
}

/** True while any dialog is mounted. The voice yields to anything the
 *  visitor deliberately opened, without either feature importing the
 *  other — a dialog is a dialog whoever put it there. */
function useDialogOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const read = () =>
      setOpen(!!document.querySelector('[role="dialog"], [role="alertdialog"]'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return open;
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [awake, setAwake] = useState(false);
  const [section, setSection] = useState<VoiceSection | null>(null);
  const [speaking, setSpeaking] = useState<VoiceTrack | null>(null);

  const dialogOpen = useDialogOpen();

  /* One player for the page, built once. A state initialiser rather than
     a lazily-filled ref because it is read during render — the context
     value carries it — and because it never changes, so the setter is
     thrown away. The audio element inside it is still created later, on
     the click that wakes the HUD, which is the gesture the autoplay
     policy is looking for. */
  const [player] = useState(() => new VoicePlayer());

  /* Track ids already spoken. A ref, not state: nothing renders from it,
     and it must be readable inside callbacks that were created before
     the most recent one was added. */
  const heard = useRef(new Set<string>());
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The track id currently being started or spoken, held synchronously.
   *  `speaking` state is a paint behind, and the settle timer is not. */
  const starting = useRef<string | null>(null);
  /** Set when the browser refused to play. Cleared by the next gesture,
   *  which is the only thing that can change its mind. */
  const blocked = useRef(false);
  /** Handed back by `takeFloor`; called when this player stops of its
   *  own accord, so a finished track does not go on holding the floor. */
  const releaseFloor = useRef<(() => void) | null>(null);
  /* The conductor reads these inside timers and event handlers that
     outlive the render they were made in. Synced after paint rather than
     during it: a ref written while rendering is a ref that disagrees with
     itself if the render is thrown away. */
  const live = useRef({
    awake,
    section,
    speaking: null as VoiceTrack | null,
  });
  useEffect(() => {
    live.current = { awake, section, speaking };
  }, [awake, section, speaking]);

  useEffect(() => () => player.destroy(), [player]);

  /* ── Which section is live ────────────────────────────────────────
     One trigger per section, spanning the 40% line. The sections are
     contiguous, so exactly one is ever active and there is no per-frame
     measuring. ScrollTrigger rather than a scroll listener because it
     already shares Lenis' clock and refreshes itself on resize — which
     matters here, since `orb` is 4078px on a desktop and 869px on a
     phone and the two layouts disagree about everything else too. */
  useEffect(() => {
    if (!awake) return;
    const triggers = VOICE_SECTIONS.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el,
        start: `top ${LINE}`,
        end: `bottom ${LINE}`,
        onToggle: ({ isActive }) => isActive && setSection(id),
      });
    }).filter(Boolean) as ScrollTrigger[];
    ScrollTrigger.refresh();
    return () => triggers.forEach((t) => t.kill());
  }, [awake]);

  /* ── Speaking ─────────────────────────────────────────────────── */

  /**
   * Fall silent without marking anything heard.
   *
   * Every path that is not a track reaching its own end comes through
   * here — stopping, a dialog opening, the tab going away. None of them
   * mean the visitor received what was being said, so none of them
   * retire the track: it stays eligible and will be offered again.
   */
  const silence = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    starting.current = null;
    releaseFloor.current?.();
    releaseFloor.current = null;
    player.stop();
    setSpeaking(null);
  }, [player]);

  const say = useCallback(
    async (track: VoiceTrack) => {
      /* Claimed synchronously, because `speaking` does not reach
         `live.current` until after the next paint and the settle timer
         could otherwise fire twice into the same gap. */
      if (starting.current) return;
      starting.current = track.id;
      setSpeaking(track);

      /* The splash can still be talking — it runs its own clips off its
         own timeline and neither of us knows about the other. Taking the
         floor stops whoever had it, so the two can never overlap. */
      releaseFloor.current?.();
      releaseFloor.current = takeFloor(silence);

      const started = await player.play(track);
      if (!started) {
        /* Nothing came out — blocked, or the file is gone. Mark it heard
           so the conductor does not sit in a loop retrying a track that
           will not play, and remember that we were blocked so the next
           real gesture can try again. */
        heard.current.add(track.id);
        starting.current = null;
        blocked.current = true;
        setSpeaking(null);
        return;
      }

      /* Warm whatever is most likely next while this one talks: the same
         section's dwell if it has one, otherwise the next section's
         brief. Costs a few KB and removes the gap between them. */
      const next =
        trackFor(track.section, "dwell") ??
        (() => {
          const i = VOICE_SECTIONS.indexOf(track.section);
          const after = VOICE_SECTIONS[i + 1];
          return after ? trackFor(after, "brief") : undefined;
        })();
      if (next && !heard.current.has(next.id)) void player.prefetch(next);
    },
    [player, silence],
  );

  /** Consider speaking. Never interrupts, never queues — if something is
   *  already being said, this does nothing and will be asked again when
   *  that finishes. */
  const consider = useCallback(() => {
    const { awake: on, section: at, speaking: busy } = live.current;
    if (!on || busy || starting.current || blocked.current || !at) return;
    const brief = trackFor(at, "brief");
    if (!brief || heard.current.has(brief.id)) return;
    void say(brief);
  }, [say]);

  /* The settle. Restarted whenever the live section changes, so crossing
     four sections in a flick schedules and cancels four times and speaks
     none of them. */
  useEffect(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (!awake || speaking || !section) return;
    settleTimer.current = setTimeout(consider, SETTLE_MS);
    return () => void (settleTimer.current && clearTimeout(settleTimer.current));
  }, [awake, section, speaking, consider]);

  /* What happens when a track finishes on its own — as opposed to being
     stopped, which is the visitor's decision and ends the matter. */
  useEffect(() => {
    return player.onEnd((trackId) => {
      const finished = live.current.speaking;
      starting.current = null;
      releaseFloor.current?.();
      releaseFloor.current = null;
      setSpeaking(null);
      if (!finished || finished.id !== trackId) return;

      /* Heard means *heard*, and this is the only place that is true.
         Marking it when the track started meant a track the visitor cut
         off after two seconds counted as delivered — so stopping the
         voice and starting it again in the same section left that
         section permanently silent, which is exactly how it read. */
      heard.current.add(finished.id);

      /* Still where you were when it started? Then you stopped to read,
         and there may be more. Otherwise everything crossed on the way
         is marked heard, so the conductor never works through a backlog
         of sections you have already left behind. */
      const now = live.current.section;
      if (now === finished.section && finished.tier === "brief") {
        const dwell = trackFor(finished.section, "dwell");
        if (dwell && !heard.current.has(dwell.id)) {
          void say(dwell);
          return;
        }
      }

      const from = VOICE_SECTIONS.indexOf(finished.section);
      const to = now ? VOICE_SECTIONS.indexOf(now) : -1;
      for (let i = from + 1; i < to; i++) {
        const passed = trackFor(VOICE_SECTIONS[i], "brief");
        if (passed) heard.current.add(passed.id);
      }
      // The settle effect picks it up from here.
    });
  }, [player, say]);

  /* ── Waking and sleeping ──────────────────────────────────────── */

  const sleep = useCallback(() => {
    silence();
    setAwake(false);
  }, [silence]);

  const wake = useCallback(() => {
    /* Where we are, asked directly rather than waited for. A trigger
       created inside its own range never fires `onToggle`, so waking mid
       section would otherwise leave the conductor believing it was
       nowhere and nothing would ever be said. */
    /* This call is inside a click, so whatever the browser thought
       before, it will allow sound now. */
    blocked.current = false;
    setSection(sectionAtLine());
    setAwake(true);
  }, []);

  const toggle = useCallback(() => {
    if (live.current.awake) sleep();
    else wake();
  }, [sleep, wake]);

  /* ── Every load starts silent ─────────────────────────────────────
     The choice is not remembered across a refresh, deliberately.

     It used to be. A visitor who had turned the voice on came back to
     it still on, and because a fresh document carries no user
     activation, that meant a page that looked awake but could not make
     a sound until something was clicked — a state that has to be
     explained to be understood. Sound that a visitor did not ask for on
     *this* page load is also the thing every autoplay policy exists to
     prevent, and iOS refuses it outright whatever we remember.

     So there is nothing stored and nothing to restore: reloading is
     always off, and turning it on is always a press.
     ────────────────────────────────────────────────────────────────── */

  /** Recovery for a `play()` the browser refused for its own reasons —
   *  rare now that waking is always a click, but not impossible. The
   *  next genuine gesture clears the latch and tries again. Passive, and
   *  a no-op once nothing is blocked. */
  useEffect(() => {
    if (!awake) return;
    const release = (e: Event) => {
      if (!blocked.current) return;
      /* A press on the HUD itself already means something — wake, sleep,
         stop. Letting it double as the release would start a track on
         the very click that was trying to end one. */
      const target = e.target as Element | null;
      if (target?.closest?.("[data-voice-hud]")) return;
      blocked.current = false;
      setSection(sectionAtLine());
      consider();
    };
    window.addEventListener("pointerdown", release, { passive: true });
    window.addEventListener("keydown", release, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", release);
    };
  }, [awake, consider]);

  /* ── Yielding ─────────────────────────────────────────────────── */

  /** A dialog is something the visitor opened on purpose. Stop, rather
   *  than pause: they are doing something else now. */
  useEffect(() => {
    if (dialogOpen && live.current.speaking) silence();
  }, [dialogOpen, silence]);

  /** Leaving the tab pauses; coming back does not resume. The next
   *  section will speak, which is a better welcome than the middle of a
   *  sentence you were not there for. */
  useEffect(() => {
    if (!awake) return;
    const onHide = () => {
      if (document.hidden && live.current.speaking) silence();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [awake, silence]);

  /** Escape stops everything. The one keyboard affordance, because it is
   *  the one people already try. */
  useEffect(() => {
    if (!awake) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && sleep();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [awake, sleep]);

  const value = useMemo(
    () => ({ awake, section, speaking, player, wake, sleep, toggle }),
    [awake, section, speaking, player, wake, sleep, toggle],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
