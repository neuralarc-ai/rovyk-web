import type { StateId } from "@/lib/bloub/states";

/* ────────────────────────────────────────────────────────────────────
   The five states, as the orb section reads them.

   `mode` is not a nickname — it is the name of the state the orb
   library actually draws, straight out of its own `STATES` table.
   Printing it is a checkable claim, which is the only kind this page
   makes. It named `thinking-orbs`' `STATE_TO_MODE` geometries until the
   blob went in; it now names `lib/bloub`'s states, because that is what
   is on screen. Two of the five happen to coincide with the label above
   them — bloub's own state is called `thinking` — and that is worth
   printing rather than dressing up: it says the library's real state is
   what you are looking at, not something built to resemble it.

   `glow` is inherited from the HUD's tone map rather than chosen here.
   The notch already colours these exact states — Thinking and Working
   in indigo, Speaking in pink, Idle and Listening left white — and a
   state that is indigo in the menu bar cannot be green further down the
   page without the palette's one-hue-one-meaning rule falling over. So
   the glow marks the phase of a run; the orb's own form marks the
   state. Two readings, no redundancy, nothing invented.
   ──────────────────────────────────────────────────────────────────── */

export type OrbGlow = "neutral" | "indigo" | "pink";

export type OrbBeat = {
  /** The state the orb library draws for this beat. */
  state: StateId;
  /**
   * Seconds after which that state starts over, for the ones that finish.
   *
   * Bloub's states were measured off a video where each is held a couple of
   * seconds and then handed on, so most of them cope with being held for as
   * long as a reader lingers: `thinking` pulses on a loop, `orbit` keeps
   * turning, and anything with visible eyes goes on breathing and blinking
   * underneath. The ones that run to an end and settle into a plain ball do
   * not, and only those get a period — a replay is a hard cut, so it is not
   * something to hand out for free.
   */
  replay?: number;
  /** What the HUD calls this state. */
  label: string;
  /** What the orb library calls it. */
  mode: string;
  title: string;
  body: string;
  /** One checkable line. The reason to believe the sentence above it. */
  fact: string;
  glow: OrbGlow;
};

export const ORB_BEATS: OrbBeat[] = [
  {
    state: "idle",
    label: "Idle",
    mode: "Idle",
    title: "Awake. Not listening.",
    body: "Nothing is captured until the wake word lands.",
    fact: "Always-on local detector",
    glow: "neutral",
  },
  {
    state: "wide",
    label: "Listening",
    mode: "Wide",
    title: "Hearing you, on your machine.",
    body: "Speech to text runs on-device. Your voice never leaves the Mac.",
    fact: "Zero audio crosses the network",
    glow: "neutral",
  },
  {
    state: "thinking",
    label: "Thinking",
    mode: "Thinking",
    title: "One brain. Fifty-nine tools.",
    body: "It reads the request, the thread and the screen, then decides.",
    fact: "No routing table, no fixed intents",
    glow: "indigo",
  },
  {
    state: "orbit",
    label: "Working",
    mode: "Orbit",
    title: "Doing the actual thing.",
    body: "Apps, files, buttons in software that never heard of Rovyk.",
    fact: "Clicks via the Accessibility API",
    glow: "indigo",
  },
  {
    state: "comet",
    // Runs to an end: the ball collapses to a point, throws its ribbons, and
    // is whole again by 2.45s. Held past that it is just a ball.
    replay: 2.6,
    label: "Speaking",
    mode: "Comet",
    title: "Answering out loud.",
    body: "A bundled on-device voice. Your hands stay where they were.",
    fact: "Supertonic TTS, shipped inside",
    glow: "pink",
  },
];

/**
 * The rail beside the beats: one numbered stop each, with two blank
 * gradations between them so it reads as a scale rather than a row of
 * dots. Only the numbered ones are worth navigating to.
 */
export const ORB_RAIL = ORB_BEATS.flatMap((_, i) =>
  i < ORB_BEATS.length - 1
    ? [
        { beat: i, stop: true },
        { beat: i, stop: false },
        { beat: i, stop: false },
      ]
    : [{ beat: i, stop: true }],
);
