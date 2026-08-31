import type { OrbState } from "thinking-orbs/engine";

/* ────────────────────────────────────────────────────────────────────
   The five states, as the orb section reads them.

   `mode` is not a nickname — it is the arrangement of lit bands the orb
   really draws for that state. Printing it is a checkable claim, which is
   the only kind this page makes, so it moved when the section's orb did:
   these named the dot-field library's modes until `<LatitudeOrb>` replaced
   it here. The hero and the HUD still draw the library, and still its
   modes.

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
  /** How the bands are lit for this state. */
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
    mode: "Even, unlit",
    title: "Awake. Not listening.",
    body: "Nothing is captured until the wake word lands.",
    fact: "Always-on local detector",
    glow: "neutral",
  },
  {
    state: "listening",
    label: "Listening",
    mode: "Filled from below",
    title: "Hearing you, on your machine.",
    body: "Speech to text runs on-device. Your voice never leaves the Mac.",
    fact: "Zero audio crosses the network",
    glow: "neutral",
  },
  {
    state: "solving",
    label: "Thinking",
    mode: "One travelling crest",
    title: "One brain. Fifty-nine tools.",
    body: "It reads the request, the thread and the screen, then decides.",
    fact: "No routing table, no fixed intents",
    glow: "indigo",
  },
  {
    state: "working",
    label: "Working",
    mode: "One travelling notch",
    title: "Doing the actual thing.",
    body: "Apps, files, buttons in software that never heard of Rovyk.",
    fact: "Clicks via the Accessibility API",
    glow: "indigo",
  },
  {
    state: "composing",
    label: "Speaking",
    mode: "Per-band waveform",
    title: "Answering out loud.",
    body: "A bundled on-device voice. Your hands stay where they were.",
    fact: "Supertonic TTS, shipped inside",
    glow: "pink",
  },
];

/**
 * The rail beside the beats, written as a ruler rather than a list of five
 * stops: one labelled gradation per state with `GAP` blank ones between, so
 * the scale carries how far apart the states are as well as which one you
 * are on. The rail holds still and this travels through it.
 */
const GAP = 8;

export const ORB_RAIL = ORB_BEATS.flatMap((_, i) =>
  i < ORB_BEATS.length - 1
    ? [
        { beat: i, stop: true },
        ...Array.from({ length: GAP }, () => ({ beat: i, stop: false })),
      ]
    : [{ beat: i, stop: true }],
);

/** One labelled stop to the next, counted in blank gradations — the label's
 *  own row is two of them tall. The section moves the ruler by this. */
export const ORB_RAIL_SEG = GAP + 2;
