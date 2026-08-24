/* ────────────────────────────────────────────────────────────────────
   The focus window's conversation, as data.

   Same idea as `hud-flows`: the script is data, the player is the
   component. Two players read this one — the voice demo and the chat
   demo — which is the point. Switching input mode changes how the turn
   is rendered, not what happens, because in the product it is the same
   brain either way.

   Errand, not chat: every turn ends with the agent having *done*
   something. Task labels share the rail's 100-odd pixels, so keep them
   short and make them verbs.
   ──────────────────────────────────────────────────────────────────── */

export type FocusTurn = {
  /** What the user says, or types. */
  said: string;
  /** What Rovyk says back. */
  reply: string;
  /** Queued when the turn starts thinking, completed one by one after. */
  tasks: string[];
};

export const FOCUS_SCRIPT: FocusTurn[] = [
  {
    said: "Find the invoice from Northlane and rename it properly.",
    reply: "Found inv_8823_final_FINAL.pdf. Renamed it 2026-08 Northlane invoice.pdf.",
    tasks: ["Search Downloads", "Read the PDF", "Rename file"],
  },
  {
    said: "File it with the others and log the amount.",
    reply: "Filed under Documents/Invoices, and £2,480 is on the ledger sheet.",
    tasks: ["Move to Invoices", "Update ledger"],
  },
  {
    said: "Remind me to chase it on Friday.",
    reply: "Reminder set for Friday at nine.",
    tasks: ["Set reminder"],
  },
];
