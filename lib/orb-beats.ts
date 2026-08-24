import type { OrbState } from "thinking-orbs/engine";

/* ────────────────────────────────────────────────────────────────────
   The five states, as the orb section reads them.

   `mode` is not a nickname — it is the name of the geometry the orb
   library actually draws for that state, straight out of its own
   `STATE_TO_MODE` table. Printing it is a checkable claim, which is the
   only kind this page makes.

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
  state: OrbState;
  /** What the HUD calls this state. */
  label: string;
  /** What the orb library calls the geometry. */
  mode: string;
  title: string;
  body: string;
  /** One checkable line. The reason to believe the sentence above it. */
  fact: string;
  glow: OrbGlow;
};

export const ORB_BEATS: OrbBeat[] = [
  {
    state: "searching",
    label: "Idle",
    mode: "Globe",
    title: "Awake. Not listening.",
    body: "Nothing is captured until the wake word lands.",
    fact: "Always-on local detector",
    glow: "neutral",
  },
  {
    state: "listening",
    label: "Listening",
    mode: "Wave",
    title: "Hearing you, on your machine.",
    body: "Speech to text runs on-device. Your voice never leaves the Mac.",
    fact: "Zero audio crosses the network",
    glow: "neutral",
  },
  {
    state: "solving",
    label: "Thinking",
    mode: "Rubik",
    title: "One brain. Fifty-nine tools.",
    body: "It reads the request, the thread and the screen, then decides.",
    fact: "No routing table, no fixed intents",
    glow: "indigo",
  },
  {
    state: "working",
    label: "Working",
    mode: "Orbits",
    title: "Doing the actual thing.",
    body: "Apps, files, buttons in software that never heard of Rovyk.",
    fact: "Clicks via the Accessibility API",
    glow: "indigo",
  },
  {
    state: "composing",
    label: "Speaking",
    mode: "Ribbon",
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
