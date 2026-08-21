/* ────────────────────────────────────────────────────────────────────
   HUD flows.

   One run of work, as data. The notch (and anything else that wants to
   replay a run) is the player; this file is the script. Adding a flow
   should never mean touching the renderer — if it does, the thing you
   added belongs in the type below rather than in the markup.

   What is deliberately NOT here: labels, tones, orb states, timings.
   Those are chrome — how the notch narrates any run — and they stay in
   the player so every flow narrates the same way.
   ──────────────────────────────────────────────────────────────────── */

export type HudFlow = {
  id: string;

  /** What the user says. Transcribed character by character as it lands. */
  request: string;

  /** The status line while it reads the situation, before the chain starts. */
  planning: string;

  /**
   * The chain, in order. Any length — the shell grows to fit — but each
   * step shares a 150px column and does not wrap, so keep them under
   * roughly 22 characters. Verbs, not nouns: these are things being done.
   */
  tasks: string[];

  /**
   * The confirmation shown before the last step commits. This is the
   * product's whole trust argument, so a flow that touches anything
   * irreversible must carry one; `null` is only for a run that does not.
   */
  gate: string | null;

  /** What it says back, out loud, once the run is done. */
  spoken: string;
};

/** The hero's run: it reads, drafts, and asks before it sends. */
export const MAIL_FLOW: HudFlow = {
  id: "mail",
  request: "Hey Rovyk, summarise my unread mail and reply to Jordan",
  planning: "Reading your inbox…",
  tasks: ["Open Mail", "Read 12 unread", "Draft reply", "Create event"],
  gate: "Send the drafted reply to jordan@northlane.co?",
  spoken:
    "Three needed a reply. I sent Jordan your Thursday confirmation and put it on the calendar.",
};

/**
 * Filing, not answering. The chain is longer and duller on purpose — this
 * is the errand nobody does, and the gate lands on the one step that
 * cannot be undone by dragging things back.
 */
export const DOWNLOADS_FLOW: HudFlow = {
  id: "downloads",
  request: "Hey Rovyk, tidy up my Downloads folder",
  planning: "Scanning Downloads…",
  tasks: [
    "Open Finder",
    "Scan 214 items",
    "Group into 6 folders",
    "Move 198 files",
    "Bin 16 duplicates",
  ],
  gate: "Move 16 duplicates to the Bin? Frees 2.4 GB.",
  spoken:
    "Downloads is down to 4 items. The rest is filed by type, duplicates in the Bin.",
};
