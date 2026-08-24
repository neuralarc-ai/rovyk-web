# Waitlist mail system — how it works, and how to rebuild it elsewhere

Reference doc. Describes the "Join the waitlist" signup + email flow as built in
`modelbeat-landing`, in enough detail that an agent can recreate it in another
Next.js project without reading this repo.

Source of truth in this repo:

| Piece | File |
| --- | --- |
| API route (sends both emails) | `app/api/waitlist/route.ts` |
| Shared zod schemas | `lib/validators.ts` |
| Modal + form | `components/waitlist/WaitlistModal.tsx` |
| Context provider (one modal per app) | `components/waitlist/WaitlistProvider.tsx` |
| CTA button | `components/waitlist/JoinWaitlistButton.tsx` |
| Mount point | `app/layout.tsx` |
| Env contract | `.env.example` |

A second route, `app/api/contact/route.ts`, reuses the **same** SMTP env and the
same helper functions. One mailer configuration serves both forms.

---

## 1. Architecture

```
JoinWaitlistButton  ──open()──►  WaitlistProvider (React context, mounted in layout)
                                        │ renders one
                                        ▼
                                 WaitlistModal
                                   │ zod-validates client-side (per field + on submit)
                                   │ POST /api/waitlist  { name, email, companyName, companyUrl }
                                   ▼
                            app/api/waitlist/route.ts
                                   │ re-validates with the SAME schema
                                   │ sanitises header values
                                   ├─► nodemailer → team notification (replyTo = visitor)
                                   └─► nodemailer → visitor confirmation (branded HTML)
                                   ▼
                            { success: true }  →  modal swaps to success panel
```

Key decisions worth preserving:

- **One schema, three uses** — per-field while typing, whole-object on submit,
  and again in the route handler. The browser is not the only thing that can
  POST, so the server never trusts the client's validation.
- **One modal for the whole app**, held in context, so every CTA anywhere opens
  the same dialog instead of anchor-jumping to a form section.
- **Plain SMTP via nodemailer**, no transactional-email SaaS. Both emails are
  sent sequentially in the same request; a failure on either one returns 500.
- **No database.** The signup exists only as the two emails. If the other
  project needs a persisted list, add the write *before* the sends and treat
  mail failure as non-fatal.

---

## 2. Environment variables

Everything the mail system reads. Copy into `.env.local` (and the host's env).

| Var | Required | Default if unset | Purpose |
| --- | --- | --- | --- |
| `SMTP_HOST` | yes | — | SMTP server hostname |
| `SMTP_PORT` | yes | — | `587` for STARTTLS. Code passes `secure: false`; for port `465` you must set `secure: true` |
| `SMTP_USER` | yes | — | SMTP username. **Also used as the literal `From:` address** on both emails |
| `SMTP_PASSWORD` | yes | — | SMTP password / app password |
| `SENDER_NAME` | no | `"Team ModelBeat"` | Display name in the `From:` header |
| `TEAM_NOTIFICATION_EMAIL` | no | `hello@neuralarc.ai` | Inbox that receives the signup notification |

Related but not part of the mail path:

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata. The confirmation email currently hardcodes `https://modelbeat.ai` for its image URLs rather than reading this — see §6 |
| `NEXT_PUBLIC_WAITLIST_CTA_VARIANTS` | Feature flag (`lib/flags.ts`) that swaps CTA labels and redirects to an external signup URL instead of opening the modal. Optional; drop it if the new project has no such flag |

Notes:

- No env is validated at boot. A missing `SMTP_HOST` fails at send time and
  surfaces as a 500 with `"Failed to process signup"`. Consider adding a startup
  check in the new project.
- `SMTP_*` are server-only (no `NEXT_PUBLIC_` prefix) — they must never be
  prefixed, or the credentials ship to the browser.

---

## 3. Dependencies

```bash
npm i nodemailer zod
npm i -D @types/nodemailer
```

The modal in this repo also uses `motion` (Framer Motion successor) and a
vendored `InlineValidation` field component. Neither is essential — see §5.

---

## 4. The API route

`app/api/waitlist/route.ts`. Structure to reproduce:

```ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { waitlistSchema } from "@/lib/validators";

// Escapes user input before it lands in an HTML email body.
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

// Strips CR/LF so a typed value can't inject extra headers into from/subject.
function sanitizeHeaderValue(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

export async function POST(request: Request) {
  try {
    const parsed = waitlistSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
        { status: 400 },
      );
    }

    const name = sanitizeHeaderValue(parsed.data.name);
    const email = sanitizeHeaderValue(parsed.data.email);
    const companyName = sanitizeHeaderValue(parsed.data.companyName);
    const companyUrl = sanitizeHeaderValue(parsed.data.companyUrl);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,                       // true for port 465
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });

    const senderName = process.env.SENDER_NAME || "Team <Product>";
    const notificationEmail = process.env.TEAM_NOTIFICATION_EMAIL || "hello@example.com";

    // 1. Team notification — replyTo is the visitor, so hitting reply works.
    await transporter.sendMail({
      from: `"${senderName}" <${process.env.SMTP_USER}>`,
      to: notificationEmail,
      replyTo: email,
      subject: `New waitlist signup: ${name}`,
      html: `...table of escaped fields...`,
    });

    // 2. Visitor confirmation — branded HTML, first name only.
    await transporter.sendMail({
      from: `"${senderName}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "You are on the <Product> waitlist",
      html: confirmationHtml(escapeHtml(name.split(" ")[0])),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json({ error: "Failed to process signup" }, { status: 500 });
  }
}
```

Three security details that must survive the port:

1. `escapeHtml` on every value interpolated into an email body.
2. `sanitizeHeaderValue` on every value that reaches a header (`subject`,
   `replyTo`, `from`) — CRLF stripping prevents header injection.
3. Server-side re-validation with the same schema, never trusting the POST body.

Nodemailer needs the Node.js runtime. Do **not** add `export const runtime = "edge"`.

### Schemas (`lib/validators.ts`)

```ts
export const nameSchema = z.string().trim().min(1, "A name is required.");

export const emailSchema = z.string().trim()
  .min(1, "A work email is required.")
  .pipe(z.email("That is not a complete email address."));   // zod v4 syntax

/** Optional by design — an empty box is not an error, a malformed one is. */
export const companyUrlSchema = z.string().trim().refine((value) => {
  if (value === "") return true;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try { return new URL(candidate).hostname.includes("."); } catch { return false; }
}, "That does not look like a web address.");

export const optionalText = z.string().trim();

export const waitlistSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  companyName: optionalText,
  companyUrl: companyUrlSchema,
});
```

On zod v3, `z.email(...)` becomes `z.string().email(...)` and the `.pipe()` is
unnecessary.

Two helpers the UI uses: `validatorFor(schema)` returns
`(value) => string | null` for a single field, and `firstIssue(error)` pulls the
first message out of a whole-form parse for the line above the submit button.

---

## 5. Client side

### Provider (`components/waitlist/WaitlistProvider.tsx`)

A context exposing only `{ open: () => void }`, memoised so consumers don't
re-render when the dialog toggles. It renders `<WaitlistModal>` itself and wraps
`children`. Mount it high in `app/layout.tsx`, above the nav and all sections,
so any of them can call `useWaitlist().open()`.

### Modal (`components/waitlist/WaitlistModal.tsx`)

Four fields: full name (required), work email (required), company name
(optional), company URL (optional). Behaviour:

- Validators are built **once at module scope** — a new validator identity each
  render restarts every field's debounce on every keystroke.
- `waitlistSchema.safeParse` on submit catches a form sent without touching
  anything (fields only speak up once visited).
- `POST /api/waitlist` with `parsed.data`; on `res.ok` swap to a success panel,
  otherwise show `"Something went wrong. Please try again."`.
- Body scroll lock, focus the first field on open, restore focus on close,
  Escape and backdrop click to close, `role="dialog"` + `aria-modal` +
  `aria-labelledby`.
- Fields reset on a 300 ms timeout after close, so they don't visibly empty out
  mid exit-animation.
- Rendered through a `Portal` into `document.body`. Necessary because any
  ancestor with `isolate` or a live transform creates a stacking context that
  caps the overlay's z-index under a sticky nav.
- **Keep the GDPR collection notice** under the submit button: who is
  collecting, what for, and a link to the privacy policy, shown at the point of
  collection. A footer-linked policy does not discharge Art. 13.

None of the motion/animation is load-bearing — a plain `<dialog>` or a Radix /
Base UI dialog works as long as the validation, submit, and a11y behaviour above
is preserved.

### Button (`components/waitlist/JoinWaitlistButton.tsx`)

Thin wrapper over the design-system `Button` that calls `open()`. Optional in a
new project — any control can call `useWaitlist().open()` directly.

---

## 6. The confirmation email template

`waitlistConfirmationHtml(firstName)` in the route file. Roughly 150 lines of
table-based HTML. Rules it follows, which apply to any rewrite:

- **Tables, not flex or grid.** Outlook renders with the Word engine, which lays
  out tables. `role="presentation"` on every layout table so screen readers read
  content in order.
- **All CSS inlined, literal hex only.** No CSS variables, no `oklch()` — email
  clients are not browsers.
- **PNG, not WebP,** for the banner. Outlook desktop has no WebP decoder. (Note
  this is the one place the repo-wide "images must be WebP" rule is inverted.)
- **Absolute image URLs** on a public origin. Currently hardcoded to
  `https://modelbeat.ai`; in a new project read `NEXT_PUBLIC_SITE_URL` instead,
  and note that local dev URLs won't resolve in a real inbox.
- **The card background must match the banner's own pixels.** Sampling it rather
  than guessing avoids a visible seam where the image ends.
- Logo mark + wordmark as separate `<img>` and `<span>`, not a flattened image,
  so the name still reads when images are blocked.
- Legal footer sits **outside** the card: postal address, why they're receiving
  it, and unsubscribe / preferences links. There's no suppression list behind
  those, so they're `mailto:` links to a human — a real requirement still needs
  actioning by hand. Wire a real preference centre if the new project has one.
- Copy describes the process ("invites go out as seats open"), never a date or a
  commitment to this specific reader.

---

## 7. Recreation checklist

1. `npm i nodemailer zod` + `@types/nodemailer`.
2. Add the six `SMTP_*` / `SENDER_NAME` / `TEAM_NOTIFICATION_EMAIL` vars to
   `.env.local` and to the deploy target's env. Document them in `.env.example`.
3. Create `lib/validators.ts` with `waitlistSchema` and the field schemas.
4. Create `app/api/waitlist/route.ts` — parse, sanitise, transport, two sends.
   Node runtime.
5. Port the confirmation HTML, swapping brand colours, logo URLs, product name,
   company name and postal address.
6. Create the provider + modal, mount the provider in `app/layout.tsx`.
7. Point CTAs at `useWaitlist().open()`.
8. Test end to end against a real SMTP account: check the team notification's
   `replyTo`, and open the confirmation in Gmail **and** Outlook desktop.

## 8. Known gaps to consider fixing in the new project

- **No rate limiting.** The endpoint will mail anyone anything as fast as it's
  called. Add an IP or email throttle before going live.
- **No persistence.** Lose the inbox, lose the list.
- **Two awaited sends.** If the confirmation fails, the visitor sees an error
  even though the team already got the notification. Consider
  `Promise.allSettled` and only failing on the notification.
- **No env validation at boot.** Misconfiguration surfaces as a runtime 500.
- **No bot protection** (honeypot / Turnstile / captcha).
