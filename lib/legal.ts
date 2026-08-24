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

/* ── The printed date, as a machine date ──────────────────────────────
   `updated` is authored to be read ("24 August 2026") and is the only
   copy of it — the terms say so out loud: "The date at the top of this
   page is the date of the version you are reading." The sitemap needs
   the same fact as a `Date`, and deriving it here keeps that promise
   true rather than introducing a second date to forget to update. */

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * The date a document was last revised.
 *
 * Built in UTC rather than by handing the string to `new Date()`, which
 * reads it as local midnight — on a machine east of Greenwich that lands
 * the previous day once serialised, so the same commit would produce a
 * different sitemap in Pune than on the build host. Throws on a date it
 * cannot read: the string is authored in this repo, so a bad one is a
 * typo worth failing the build over rather than shipping a silent 1970.
 */
export function updatedAt(doc: LegalDoc): Date {
  const [day, month, year] = doc.updated.trim().split(/\s+/);
  const index = MONTHS.indexOf((month ?? "").toLowerCase());

  if (index === -1 || !/^\d{1,2}$/.test(day ?? "") || !/^\d{4}$/.test(year ?? "")) {
    throw new Error(
      `legal: cannot read \`updated\` as a date: "${doc.updated}". ` +
        `Expected a form like "24 August 2026".`,
    );
  }

  return new Date(Date.UTC(Number(year), index, Number(day)));
}

/** The entity behind both documents, written once. */
export const ENTITY = {
  legal: "Neural Arc, Inc.",
  incorporated: "Delaware",
  office: "Pune, India",
  email: "hello@neuralarc.ai",
} as const;
