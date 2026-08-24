/* ────────────────────────────────────────────────────────────────────
   The waitlist emails.

   Lifted out of the route so the words and the request handling are not
   the same file. Nothing here touches the network or reads a request —
   it takes a name and returns strings, which also makes it the one part
   of the flow you can check without an SMTP server.

   Email is not the web, and every rule below follows from that:

   - Tables, never flex or grid. Outlook desktop lays out with the Word
     engine, which does tables and little else. `role="presentation"` on
     every layout table, so a screen reader reads content rather than
     announcing a grid.
   - Every declaration inlined, literal hex only. There is no
     stylesheet, and `oklch()` and custom properties — which is how the
     rest of this codebase states a colour — resolve to nothing.
   - No images. `rovyk-wordmark.svg` is the only mark we have and no
     client renders SVG; a text wordmark also survives images-off, which
     is how a good share of these get read. Swap in a hosted PNG here if
     one ever gets made.
   - `border-radius` degrades to square corners in Outlook rather than
     breaking, so it is used but never load-bearing.
   - Every variant ships a plain-text part too. It is not a fallback
     nobody sees — it is what a screen reader, a watch and a spam filter
     read first.
   ──────────────────────────────────────────────────────────────────── */

/** Escapes user input before it lands in an HTML email body. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!,
  );
}

/* ── Palette ──────────────────────────────────────────────────────────
   The site's own ramp, resolved to literal hex. The alpha borders the
   page uses (`rgba(255,255,255,.1)`) are flattened against the surface
   they sit on, since a mail client compositing an alpha border over a
   background it decided to override is the fastest way to lose an edge. */
const DARK = {
  void: "#000000",
  ground: "#0b0b0b",
  card: "#171717",
  raised: "#1e1e1e",
  edge: "#262626",
  edgeSoft: "#202020",
  ink: "#ffffff",
  muted: "#b4b4b4",
  faint: "#8a8a8a",
  ghost: "#5e5e5e",
} as const;

const LIGHT = {
  paper: "#f4f3f0",
  card: "#ffffff",
  edge: "#e0ded8",
  ink: "#121212",
  muted: "#4a4a4a",
  faint: "#767676",
} as const;

const INDIGO = "#555af4";
const GREEN = "#3ecf8e";

const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO =
  "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";

/* ── Copy ─────────────────────────────────────────────────────────────
   Shared across every variant, so picking a design never quietly picks
   different words. Describes the process and never a date — there is no
   ship date to give, and inventing one is the single thing this product
   cannot afford to do in writing. */

const LEDE =
  "You are on the list for Rovyk, the voice agent that lives in your Mac's menu bar and actually operates the machine.";

const PROCESS =
  "There is no date to give you, and we would rather not invent one. Invites go out in batches as seats open, and yours arrives at this address.";

/** The honest footnote. Better said now than discovered on install day. */
const CAVEAT =
  "Rovyk needs Apple Silicon and macOS 27 or later. Intel Macs are not supported.";

const SIGN_OFF = "Team Rovyk";

export const CONFIRMATION_SUBJECT = "You are on the Rovyk waitlist";

/** The line the inbox previews next to the subject. Rendered hidden in the
 *  body, or it reads twice. */
const PREHEADER = "Invites go out in batches as seats open. Nothing to do yet.";

function preheader(): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(PREHEADER)}</div>`;
}

/** Host, without the scheme — what a person would say out loud. */
function host(site: string): string {
  return site.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const UNSUBSCRIBE =
  "mailto:hello@neuralarc.ai?subject=Unsubscribe%20from%20the%20Rovyk%20waitlist";

/* ── Why the wordmark is text and not an image ────────────────────────
   It was a PNG for a moment and it is not any more.

   No mail client renders SVG — Gmail and Outlook both strip it — so the
   mark has to be a raster, and a raster in an email has to be fetched
   over HTTPS from a public origin. There isn't one yet: with
   `NEXT_PUBLIC_SITE_URL` pointing at localhost, every recipient gets a
   broken-image icon where the logo should be. That is strictly worse
   than no logo.

   Set as text, it renders identically everywhere, needs no hosting, and
   survives images-off — which is how a fair share of these get read.

   To bring the image back once the site is deployed: rasterise
   `public/assets/rovyk-wordmark.svg` to PNG at 3x the display size, bake
   the surrounding background colour into the pixels rather than leaving
   it transparent (a transparent mark is how a white wordmark vanishes in
   dark mode), and style the `<img>` with font and colour so the alt text
   still reads as the wordmark when images are blocked. */

/**
 * The small print, outside whatever card the variant draws.
 *
 * Who sent it, why it arrived, and how to make it stop. There is no
 * suppression list behind that last one — it is a mailto to a human who has
 * to action it by hand, so keep an eye on that inbox.
 */
function legalFooter(site: string, tone: "dark" | "light"): string {
  const c = tone === "dark" ? DARK.ghost : LIGHT.faint;
  return `<tr><td style="padding:22px 8px 0;">
    <p style="margin:0 0 7px;font:400 11.5px/1.6 ${SANS};color:${c};">Neural Arc, Inc. &middot; Pune, India</p>
    <p style="margin:0;font:400 11.5px/1.6 ${SANS};color:${c};">
      You asked to join the Rovyk waitlist at <a href="${site}" style="color:${c};text-decoration:underline;">${escapeHtml(host(site))}</a>. We only write about Rovyk.
      <a href="${UNSUBSCRIBE}" style="color:${c};text-decoration:underline;">Unsubscribe</a>.
    </p>
  </td></tr>`;
}

/** Wraps a variant's body table in the boilerplate every one of them needs. */
function document_(opts: {
  ground: string;
  scheme: "dark light" | "light dark";
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="${opts.scheme}">
<meta name="supported-color-schemes" content="${opts.scheme}">
<title>${escapeHtml(CONFIRMATION_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:${opts.ground};-webkit-font-smoothing:antialiased;">
${preheader()}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${opts.ground};">
<tr><td align="center" style="padding:36px 16px 44px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
${opts.body}
</table>
</td></tr>
</table>
</body>
</html>`;
}

export type ConfirmationData = { firstName: string; site: string };

/* ══════════════════════════════════════════════════════════════════════
   00 · Current — the one in the route today, kept for comparison.
   ══════════════════════════════════════════════════════════════════════ */

function currentHtml({ firstName, site }: ConfirmationData): string {
  const name = escapeHtml(firstName);
  return document_({
    ground: DARK.void,
    scheme: "dark light",
    body: `
<tr><td style="padding:0 4px 18px;">
  <span style="font:600 17px ${SANS};letter-spacing:.14em;color:${DARK.ink};">ROVYK</span>
</td></tr>
<tr><td style="background:${DARK.card};border:1px solid ${DARK.edge};border-radius:16px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="padding:34px 32px 30px;">
      <h1 style="margin:0 0 20px;font:500 26px/1.2 ${SANS};letter-spacing:-.02em;color:${DARK.ink};">You are on the list.</h1>
      <p style="margin:0 0 16px;font:400 15px/1.62 ${SANS};color:${DARK.muted};">Hi ${name},</p>
      <p style="margin:0 0 16px;font:400 15px/1.62 ${SANS};color:${DARK.muted};">${escapeHtml(LEDE)}</p>
      <p style="margin:0 0 16px;font:400 15px/1.62 ${SANS};color:${DARK.muted};">${escapeHtml(PROCESS)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 4px;">
        <tr><td style="padding:2px 0 2px 14px;border-left:2px solid ${INDIGO};font:400 14px/1.55 ${SANS};color:${DARK.muted};">Worth knowing up front: ${escapeHtml(CAVEAT)}</td></tr>
      </table>
      <p style="margin:26px 0 0;font:400 15px/1.62 ${SANS};color:${DARK.faint};">${escapeHtml(SIGN_OFF)}</p>
    </td></tr>
  </table>
</td></tr>
${legalFooter(site, "dark")}`,
  });
}

/* ══════════════════════════════════════════════════════════════════════
   A · Plate

   The instrument treatment the site uses for anything checkable: an
   engraved mono label, an inner scribe line, and a run of label/value
   rows. The message is a readout rather than a letter, which suits a
   product whose whole pitch is that it shows you its work.
   ══════════════════════════════════════════════════════════════════════ */

function plateRow(label: string, value: string, accent?: string): string {
  return `<tr>
    <td style="padding:11px 0;border-top:1px solid ${DARK.edgeSoft};font:400 10.5px ${MONO};letter-spacing:.16em;text-transform:uppercase;color:${DARK.faint};width:104px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:11px 0;border-top:1px solid ${DARK.edgeSoft};font:400 13.5px/1.45 ${SANS};color:${accent ?? DARK.ink};vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

function plateHtml({ firstName, site }: ConfirmationData): string {
  return document_({
    ground: DARK.void,
    scheme: "dark light",
    body: `
<tr><td style="background:${DARK.ground};border:1px solid #2e2e2e;border-radius:4px;padding:5px;">
  <!-- The scribe line: a second, tighter rule inside the plate's edge. On
       the site this is a pseudo-element; here it has to be a real nested
       table, which is the usual tax for anything decorative in email. -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${DARK.edgeSoft};border-radius:2px;">
    <tr><td style="padding:30px 30px 32px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 30px;">
        <tr>
          <td style="font:600 13px ${SANS};letter-spacing:.22em;color:${DARK.ink};">ROVYK</td>
          <td align="right" style="font:400 10px ${MONO};letter-spacing:.2em;text-transform:uppercase;color:${DARK.ghost};">Waitlist &middot; Confirmed</td>
        </tr>
      </table>

      <h1 style="margin:0 0 14px;font:500 27px/1.12 ${SANS};letter-spacing:-.03em;color:${DARK.ink};">You are on the list, ${escapeHtml(firstName)}.</h1>
      <p style="margin:0 0 26px;font:400 14.5px/1.62 ${SANS};color:${DARK.muted};">${escapeHtml(PROCESS)}</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${plateRow("Status", "On the list", GREEN)}
        ${plateRow("Build", "Not released yet")}
        ${plateRow("Requires", "Apple Silicon, macOS 27 or later")}
        ${plateRow("Reply to", "hello@neuralarc.ai")}
      </table>

      <p style="margin:26px 0 0;padding:0 0 0 13px;border-left:2px solid ${INDIGO};font:400 13px/1.55 ${SANS};color:${DARK.faint};">Intel Macs are not supported. Better said now than found out on install day.</p>

    </td></tr>
  </table>
</td></tr>
${legalFooter(site, "dark")}`,
  });
}

/* ══════════════════════════════════════════════════════════════════════
   B · Letter

   No card, no chrome, no rules — the ground of the email is the page.
   One display-size line, a narrow measure under it, and a signature.
   Reads as though a person sent it, which for a list of a few hundred
   people is the truth.
   ══════════════════════════════════════════════════════════════════════ */

function letterHtml({ firstName, site }: ConfirmationData): string {
  const para = `margin:0 0 20px;font:300 16px/1.68 ${SANS};color:${DARK.muted};`;
  return document_({
    ground: DARK.ground,
    scheme: "dark light",
    body: `
<tr><td style="padding:8px 8px 0;">

  <span style="font:600 13px ${SANS};letter-spacing:.24em;color:${DARK.faint};">ROVYK</span>

  <h1 style="margin:40px 0 30px;font:400 40px/1.05 ${SANS};letter-spacing:-.04em;color:${DARK.ink};">You&rsquo;re on<br>the list.</h1>

  <p style="${para}">Hi ${escapeHtml(firstName)},</p>
  <p style="${para}">${escapeHtml(LEDE)}</p>
  <p style="${para}">${escapeHtml(PROCESS)}</p>
  <p style="${para}">One thing worth saying now rather than on install day: ${escapeHtml(CAVEAT)}</p>

  <!-- A short rule instead of a full-width one: this is a signature block,
       not a new section. -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:36px 0 0;">
    <tr><td style="width:40px;height:1px;background:${DARK.edge};line-height:1px;font-size:0;">&nbsp;</td></tr>
  </table>
  <p style="margin:20px 0 0;font:400 14px/1.6 ${SANS};color:${DARK.faint};">${escapeHtml(SIGN_OFF)}<br><span style="color:${DARK.ghost};">Neural Arc, Inc.</span></p>

</td></tr>
${legalFooter(site, "dark")}`,
  });
}

/* ══════════════════════════════════════════════════════════════════════
   C · HUD

   The product's own surface, as an email. A notch bar across the top,
   then the signup rendered as the task rows the HUD uses when Rovyk is
   working — two done, one pending. The conceit earns its place: the
   pitch is that you can see what the agent is doing, and this is the
   first thing we ever send.
   ══════════════════════════════════════════════════════════════════════ */

function hudRow(state: "done" | "pending", label: string): string {
  const done = state === "done";
  const dot = done ? GREEN : DARK.ghost;
  return `<tr>
    <td style="padding:0 0 0 0;width:26px;vertical-align:top;">
      <!-- A filled round cell rather than a bullet glyph, which every client
           sizes differently. -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0;">
        <tr><td style="width:7px;height:7px;background:${dot};border-radius:7px;line-height:7px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
    <td style="padding:2px 0 14px;font:400 14px/1.5 ${SANS};color:${done ? DARK.ink : DARK.faint};">${escapeHtml(label)}</td>
  </tr>`;
}

function hudHtml({ firstName, site }: ConfirmationData): string {
  return document_({
    ground: DARK.void,
    scheme: "dark light",
    body: `
<!-- The notch. Square top, rounded bottom, hanging off the top edge the way
     it does on the site. Outlook drops the radius and it becomes a plain
     black bar, which is still the right shape. -->
<tr><td align="center" style="padding:0 0 26px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="background:${DARK.void};border:1px solid ${DARK.edge};border-top:0;border-radius:0 0 15px 15px;padding:9px 26px 10px;font:600 12px ${SANS};letter-spacing:.2em;color:${DARK.ink};">ROVYK</td></tr>
  </table>
</td></tr>

<tr><td style="background:${DARK.card};border:1px solid ${DARK.edge};border-radius:18px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="padding:32px 32px 12px;">
      <p style="margin:0 0 18px;font:400 10px ${MONO};letter-spacing:.2em;text-transform:uppercase;color:${DARK.ghost};">Heard you</p>
      <h1 style="margin:0 0 12px;font:500 26px/1.15 ${SANS};letter-spacing:-.03em;color:${DARK.ink};">You&rsquo;re on the list, ${escapeHtml(firstName)}.</h1>
      <p style="margin:0 0 26px;font:400 14.5px/1.6 ${SANS};color:${DARK.muted};">${escapeHtml(LEDE)}</p>
    </td></tr>

    <!-- The task rows, on the raised surface the HUD uses. -->
    <tr><td style="padding:0 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${DARK.raised};border:1px solid ${DARK.edgeSoft};border-radius:12px;">
        <tr><td style="padding:18px 20px 6px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${hudRow("done", "Address received")}
            ${hudRow("done", "Added to the waitlist")}
            ${hudRow("pending", "Invite: goes out as seats open")}
          </table>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:24px 32px 32px;">
      <p style="margin:0 0 18px;font:400 14.5px/1.6 ${SANS};color:${DARK.muted};">${escapeHtml(PROCESS)}</p>
      <p style="margin:0;padding:0 0 0 13px;border-left:2px solid ${INDIGO};font:400 13px/1.55 ${SANS};color:${DARK.faint};">${escapeHtml(CAVEAT)}</p>
    </td></tr>
  </table>
</td></tr>
${legalFooter(site, "dark")}`,
  });
}

/* ══════════════════════════════════════════════════════════════════════
   D · Paper

   The one that inverts. Worth having on the table for a reason that has
   nothing to do with taste: a dark email is the riskiest thing you can
   send. Outlook desktop ignores `color-scheme`, some Gmail configs
   force-invert dark palettes and mangle them, and a forwarded dark email
   pasted into a light thread looks broken. Black ink on paper renders
   the same everywhere, which for the first email a stranger gets from us
   is an argument in itself.
   ══════════════════════════════════════════════════════════════════════ */

function paperHtml({ firstName, site }: ConfirmationData): string {
  const para = `margin:0 0 18px;font:400 15px/1.65 ${SANS};color:${LIGHT.muted};`;
  return document_({
    ground: LIGHT.paper,
    scheme: "light dark",
    body: `
<tr><td style="background:${LIGHT.card};border:1px solid ${LIGHT.edge};border-radius:14px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

    <tr><td style="padding:28px 34px 24px;border-bottom:1px solid ${LIGHT.edge};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font:600 13px ${SANS};letter-spacing:.22em;color:${LIGHT.ink};">ROVYK</td>
          <td align="right" style="font:400 10px ${MONO};letter-spacing:.16em;text-transform:uppercase;color:${LIGHT.faint};">Waitlist</td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="padding:34px 34px 32px;">
      <h1 style="margin:0 0 22px;font:500 28px/1.12 ${SANS};letter-spacing:-.03em;color:${LIGHT.ink};">You are on the list.</h1>
      <p style="${para}">Hi ${escapeHtml(firstName)},</p>
      <p style="${para}">${escapeHtml(LEDE)}</p>
      <p style="${para}">${escapeHtml(PROCESS)}</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:26px 0 0;">
        <tr><td style="padding:14px 16px;background:${LIGHT.paper};border-left:2px solid ${INDIGO};font:400 13.5px/1.55 ${SANS};color:${LIGHT.muted};">${escapeHtml(CAVEAT)}</td></tr>
      </table>

      <p style="margin:28px 0 0;font:400 14px/1.6 ${SANS};color:${LIGHT.faint};">${escapeHtml(SIGN_OFF)}</p>
    </td></tr>

  </table>
</td></tr>
${legalFooter(site, "light")}`,
  });
}

/* ── Plain text ───────────────────────────────────────────────────────
   One version, shared by every variant. The design is the HTML part's
   business; the text part is the same message either way, and having two
   of them would only be two things to keep in sync. */

export function confirmationText({
  firstName,
  site,
}: ConfirmationData): string {
  return [
    `Hi ${firstName},`,
    "",
    LEDE,
    "",
    PROCESS,
    "",
    `Worth knowing up front: ${CAVEAT}`,
    "",
    `${SIGN_OFF}, Neural Arc, Inc.`,
    "",
    `You asked to join the Rovyk waitlist at ${host(site)}.`,
    "To be removed, reply with 'unsubscribe' or write to hello@neuralarc.ai.",
  ].join("\n");
}

/* ── The registry ─────────────────────────────────────────────────────
   Five treatments of the same words; the route sends one of them.
   Switching is a one-line change to `DEFAULT_VARIANT` below — the other
   four stay compiled and reachable, so a swap is never a rewrite. */

export type VariantId = "current" | "plate" | "letter" | "hud" | "paper";

export type Variant = {
  id: VariantId;
  /** Lab label. */
  name: string;
  /** What is different about it, and why it might be the one. */
  note: string;
  html: (data: ConfirmationData) => string;
};

export const VARIANTS: Variant[] = [
  {
    id: "current",
    name: "Current",
    note: "Wordmark, card, heading, two paragraphs, an indigo rule. Nothing wrong with it and nothing to remember it by — the one you flagged.",
    html: currentHtml,
  },
  {
    id: "plate",
    name: "Plate",
    note: "The instrument treatment the site uses for anything checkable: engraved mono label, an inner scribe line, and status / build / requires as label-value rows. A readout rather than a letter.",
    html: plateHtml,
  },
  {
    id: "letter",
    name: "Letter",
    note: "No card and no rules — the ground of the email is the page. One line at display size, a narrow measure, a short rule and a signature. Reads as though a person sent it, which for a few hundred people it did.",
    html: letterHtml,
  },
  {
    id: "hud",
    name: "HUD",
    note: "The product's own surface. A notch across the top, then the signup as the task rows the HUD shows while Rovyk works — two done, one pending. The pitch is that you can see what the agent is doing; this is the first chance to show it.",
    html: hudHtml,
  },
  {
    id: "paper",
    name: "Paper",
    note: "The one that inverts, and not for taste. Outlook desktop ignores color-scheme, some Gmail configs force-invert dark palettes badly, and a dark email forwarded into a light thread looks broken. Ink on paper renders the same everywhere.",
    html: paperHtml,
  },
];

const BY_ID = new Map(VARIANTS.map((v) => [v.id, v]));

/** Which one the route actually sends. Change it here. */
export const DEFAULT_VARIANT: VariantId = "letter";

export function confirmationEmail(
  data: ConfirmationData,
  variant: VariantId = DEFAULT_VARIANT,
): { subject: string; html: string; text: string } {
  const chosen = BY_ID.get(variant) ?? BY_ID.get(DEFAULT_VARIANT)!;
  return {
    subject: CONFIRMATION_SUBJECT,
    html: chosen.html(data),
    text: confirmationText(data),
  };
}

/* ── The team notification ────────────────────────────────────────────
   Nobody needs this to be beautiful, but somebody has to read it forty
   times a day, so it is the same plate language: the four values, big
   enough to scan, and nothing else. */

export type NotificationFields = {
  name: string;
  email: string;
  mac: string;
  use: string;
};

export function notificationEmail(fields: NotificationFields): {
  subject: string;
  html: string;
  text: string;
} {
  const row = (label: string, value: string) => `<tr>
    <td style="padding:11px 0;border-top:1px solid ${DARK.edgeSoft};font:400 10.5px ${MONO};letter-spacing:.16em;text-transform:uppercase;color:${DARK.faint};width:92px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:11px 0;border-top:1px solid ${DARK.edgeSoft};font:400 14px/1.5 ${SANS};color:${DARK.ink};vertical-align:top;">${escapeHtml(value) || `<span style="color:${DARK.ghost};">not given</span>`}</td>
  </tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="dark light"></head>
<body style="margin:0;padding:24px;background:${DARK.void};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;background:${DARK.card};border:1px solid ${DARK.edge};border-radius:12px;">
<tr><td style="padding:26px 28px;">
  <p style="margin:0 0 20px;font:400 10px ${MONO};letter-spacing:.2em;text-transform:uppercase;color:${INDIGO};">New waitlist signup</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    ${row("Name", fields.name)}
    ${row("Email", fields.email)}
    ${row("Mac", fields.mac)}
    ${row("Use", fields.use)}
  </table>
  <p style="margin:20px 0 0;font:400 12px ${SANS};color:${DARK.ghost};">Reply to write straight back to them.</p>
</td></tr>
</table>
</body></html>`;

  return {
    subject: `Rovyk waitlist: ${fields.name}`,
    text: [
      `Name:  ${fields.name}`,
      `Email: ${fields.email}`,
      `Mac:   ${fields.mac || "not given"}`,
      `Use:   ${fields.use || "not given"}`,
    ].join("\n"),
    html,
  };
}
