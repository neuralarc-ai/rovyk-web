/* ────────────────────────────────────────────────────────────────────
   The shape of a legal document on this site.

   Legal copy is content, not layout, so it lives here beside the tool
   list and the orb beats rather than inside a page. Four block kinds is
   the whole vocabulary — a paragraph, a list, the hairline label/value
   rows the rest of the page states checkable facts in, and a plain
   English aside. Anything a clause cannot be said in with those four is
   a clause that wants rewriting.
   ──────────────────────────────────────────────────────────────────── */

export type LegalBlock =
  /** A paragraph. */
  | { p: string }
  /** A bulleted run. Each item is one obligation or one fact. */
  | { list: string[] }
  /** Label and value, set as the spec rows the control and tools
   *  sections use — for anything that is really a table. */
  | { rows: [label: string, value: string][] }
  /** The clause above, said the way we would say it out loud. */
  | { note: string };

export type LegalSection = {
  /** Anchor, and the nav's key. Kebab case, stable — these get linked to. */
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDoc = {
  eyebrow: string;
  title: string;
  /** Human date, as printed. There is no other copy of it. */
  updated: string;
  lede: string;
  sections: LegalSection[];
};

/** The entity behind both documents, written once. */
export const ENTITY = {
  legal: "Neural Arc, Inc.",
  incorporated: "Delaware",
  office: "Pune, India",
  email: "hello@neuralarc.ai",
} as const;
