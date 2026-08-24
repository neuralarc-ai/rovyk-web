import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { waitlistSchema } from "@/lib/validators";
import { confirmationEmail, notificationEmail } from "@/lib/waitlist-email";

/* ────────────────────────────────────────────────────────────────────
   The waitlist endpoint.

   A signup is two emails and nothing else: one to us so somebody knows,
   one to the person so they know we know. There is no database, which
   is the same answer the privacy page gives — the list is an inbox.
   Lose the inbox and you have lost the list, so if this ever needs to
   be a real list, write the row BEFORE the sends and let mail failure
   be non-fatal.

   The markup for both emails lives in `lib/waitlist-email.ts`, so this
   file stays about the request and that one stays about the words.

   Runs on the Node runtime. nodemailer opens a TCP socket to an SMTP
   server, which the edge runtime cannot do — do not add
   `export const runtime = "edge"` to this file.
   ──────────────────────────────────────────────────────────────────── */

/** Strips CR/LF so a typed value cannot inject extra headers into
 *  `subject`, `replyTo` or `from`. */
function sanitizeHeaderValue(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

/* ── Rate limit ───────────────────────────────────────────────────────
   A speed bump, not a lock. The map lives in one server process, so it
   resets on deploy and does not exist at all across instances — it stops
   somebody holding down Enter, and nothing more determined than that.
   Put a real limiter in front of this before it matters. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  // The map would otherwise grow for the life of the process.
  if (hits.size > 5_000) {
    for (const [k, times] of hits) {
      if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(k);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

/** Whatever the proxy in front of us says the client is. Spoofable, which
 *  is fine for a speed bump. */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/* ── SMTP ─────────────────────────────────────────────────────────── */

const REQUIRED_ENV = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
] as const;

function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

function transport() {
  const port = Number(process.env.SMTP_PORT);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 starts plain and upgrades via STARTTLS.
    // Deriving it from the port rather than hardcoding `false` means one
    // fewer thing to get wrong when the provider changes.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

/** The canonical origin, as the confirmation should name it. A localhost
 *  value will not resolve in a real inbox — set `NEXT_PUBLIC_SITE_URL`. */
function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://rovyk.app";
}

export async function POST(request: Request) {
  try {
    const missing = missingEnv();
    if (missing.length) {
      console.error(`Waitlist: missing SMTP env — ${missing.join(", ")}`);
      return NextResponse.json(
        { error: "Signups are not configured yet." },
        { status: 503 },
      );
    }

    if (rateLimited(clientKey(request), Date.now())) {
      return NextResponse.json(
        { error: "Too many signups from here. Try again in a minute." },
        { status: 429 },
      );
    }

    const body: unknown = await request.json();

    // Honeypot. A field that is invisible and unlabelled in the form, so
    // a person cannot fill it in and a naive bot fills in everything.
    // Answered with a 200 on purpose — a bot that learns it failed is a
    // bot that tries something else.
    if (
      typeof body === "object" &&
      body !== null &&
      "company" in body &&
      String((body as Record<string, unknown>).company ?? "") !== ""
    ) {
      return NextResponse.json({ success: true });
    }

    const parsed = waitlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
        { status: 400 },
      );
    }

    const name = sanitizeHeaderValue(parsed.data.name);
    const email = sanitizeHeaderValue(parsed.data.email);
    const mac = sanitizeHeaderValue(parsed.data.mac);
    const use = sanitizeHeaderValue(parsed.data.use);

    const mailer = transport();
    const senderName = process.env.SENDER_NAME || "Team Rovyk";
    const from = `"${sanitizeHeaderValue(senderName)}" <${process.env.SMTP_USER}>`;
    const notify = process.env.TEAM_NOTIFICATION_EMAIL || "hello@neuralarc.ai";

    const notification = notificationEmail({ name, email, mac, use });
    const confirmation = confirmationEmail({
      // First name only. Also drops anything a "name" was carrying after
      // the first token, which is where injection attempts live.
      firstName: name.split(" ")[0] || name,
      site: siteOrigin(),
    });

    /* Both sends are attempted, but only one of them decides the answer.
       The signup IS the team notification — if that lands, the person is
       on the list, and telling them it failed because their own copy
       bounced would be a lie that also loses us the address. */
    const [notified, confirmed] = await Promise.allSettled([
      mailer.sendMail({
        from,
        to: notify,
        // So hitting reply in the inbox writes to the person, not to us.
        replyTo: email,
        subject: sanitizeHeaderValue(notification.subject),
        text: notification.text,
        html: notification.html,
      }),
      mailer.sendMail({
        from,
        to: email,
        subject: confirmation.subject,
        text: confirmation.text,
        html: confirmation.html,
      }),
    ]);

    if (notified.status === "rejected") {
      console.error("Waitlist notification failed:", notified.reason);
      return NextResponse.json(
        { error: "Failed to process signup" },
        { status: 500 },
      );
    }

    if (confirmed.status === "rejected") {
      // Logged, not surfaced. They are on the list; they just did not get
      // the receipt, and the address is in our inbox to chase by hand.
      console.error("Waitlist confirmation failed:", confirmed.reason);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Failed to process signup" },
      { status: 500 },
    );
  }
}
