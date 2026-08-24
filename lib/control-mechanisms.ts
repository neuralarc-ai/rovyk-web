import {
  ClockCounterClockwiseIcon,
  LockSimpleIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react/dist/ssr";

/* ────────────────────────────────────────────────────────────────────
   The three control mechanisms: their copy, and their demos.

   Kept apart from any one section's layout, because the demos are the
   substance and the card around them is a decision that can change.
   ──────────────────────────────────────────────────────────────────── */

export type Mechanism = {
  n: string;
  icon: typeof LockSimpleIcon;
  /** Two or three words, for treatments that want a name before a claim. */
  name: string;
  title: string;
  body: string;
  tags: string[];
  /** Label/value pairs, for treatments that read as a spec rather than prose. */
  spec: [string, string][];
};

export const MECHANISMS: Mechanism[] = [
  {
    n: "01",
    icon: LockSimpleIcon,
    name: "Confirmation gate",
    title: "It asks before anything irreversible",
    body: "Deleting, moving, sending. The gate is written in code and runs independently of the model, so no amount of clever prompting talks its way past it. Cancel is the default.",
    tags: ["deterministic", "model-independent", "always on"],
    spec: [
      ["Enforced by", "code, not the model"],
      ["Stands in front of", "delete \u00b7 move \u00b7 send"],
      ["Default answer", "cancel"],
    ],
  },
  {
    n: "02",
    icon: ClockCounterClockwiseIcon,
    name: "Honesty check",
    title: "It cannot lie about what it did",
    body: "An automated pass runs after every reply and catches the assistant claiming a completed action it never performed. Most products in this category will not admit that failure mode exists. Rovyk ships a guard against it.",
    tags: ["post-reply", "automatic", "non-negotiable"],
    spec: [
      ["Runs", "after every reply"],
      ["Compares", "claims against what ran"],
      ["On a mismatch", "the reply is corrected"],
    ],
  },
  {
    n: "03",
    icon: SlidersHorizontalIcon,
    name: "Permissions",
    title: "You grant access one piece at a time",
    body: "Folders, mail, calendar, contacts, Accessibility. Every one is a separate macOS permission that you approve individually and can revoke in System Settings at any moment, without uninstalling anything.",
    tags: ["granular", "revocable", "yours"],
    spec: [
      ["Granted", "one at a time"],
      ["Revoked in", "System Settings"],
      ["Without any of it", "it still runs"],
    ],
  },
];
