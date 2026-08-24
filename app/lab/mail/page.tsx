import type { Metadata } from "next";
import {
  DEFAULT_VARIANT,
  VARIANTS,
  confirmationText,
  notificationEmail,
  type ConfirmationData,
} from "@/lib/waitlist-email";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   Throwaway. Every confirmation-email variant, rendered from the same
   module the route sends from, so what is on screen here is byte for
   byte what lands in an inbox. Delete this route once one is picked.

   Each preview is an `<iframe srcDoc>` rather than the markup dropped
   into the page. It has to be: the templates set colours and fonts on
   `body` and rely on default table rendering, and Tailwind's preflight
   would flatten all of it — you would be reviewing a version of the
   email that nobody will ever receive.
   ──────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Lab — waitlist email variants",
  robots: { index: false, follow: false },
};

/** Deliberately a real-shaped signup rather than "John Doe". */
const SAMPLE: ConfirmationData = {
  firstName: "Ada",
  site: process.env.NEXT_PUBLIC_SITE_URL || "https://rovyk.app",
};

const NOTIFICATION = notificationEmail({
  name: "Ada Lovelace",
  email: "ada@example.com",
  mac: "M2 MacBook Air, 16 GB",
  use: "Tidying my Downloads folder, mostly",
});

/** Tall enough for the longest variant to render without its own scrollbar,
 *  which would otherwise read as part of the design. */
const FRAME_H = 860;

function Preview({
  label,
  name,
  note,
  html,
  shipping,
}: {
  label: string;
  name: string;
  note: string;
  html: string;
  shipping?: boolean;
}) {
  return (
    <section className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] tracking-[0.18em] text-white/34 uppercase">
          {label}
        </span>
        <h2 className="text-[21px] tracking-[-0.025em]">{name}</h2>
        {shipping && (
          <span className="rounded-[3px] border border-brand-indigo/50 px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] text-brand-indigo-text uppercase">
            Sending now
          </span>
        )}
      </div>

      <p className="mb-5 max-w-[70ch] text-[13.5px] leading-[1.6] font-light text-white/45">
        {note}
      </p>

      {/* A hairline frame so the email's own ground — black in three of
          these, paper in one — reads as the email rather than as the page. */}
      <div className="overflow-hidden rounded-xl border border-input bg-black">
        <iframe
          title={`${name} — waitlist confirmation email`}
          srcDoc={html}
          className="block w-full"
          style={{ height: FRAME_H }}
        />
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-10">
      <header className="mb-14">
        <span className="font-mono text-[11px] tracking-[0.2em] text-white/34 uppercase">
          Throwaway
        </span>
        <h1 className="mt-3 text-[clamp(28px,3.4vw,44px)] leading-[1.06] tracking-[-0.035em]">
          Waitlist email — five treatments
        </h1>
        <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.6] font-light text-white/55">
          Same words in every one — the copy is settled and only the design is
          the variable. Rendered from <code className="font-mono text-white/70">lib/waitlist-email.ts</code>,
          which is the module the route actually sends, so these are the real
          emails and not an approximation of them.
        </p>

        <ul className="mt-7 flex flex-col gap-2 border-t border-border pt-6 text-[13px] leading-[1.6] font-light text-white/45">
          <li>
            <span className="text-white/70">Pick one</span> and set{" "}
            <code className="font-mono text-white/70">DEFAULT_VARIANT</code> in
            that module. Nothing else changes.
          </li>
          <li>
            <span className="text-white/70">Check it in a real client</span>{" "}
            before shipping. An iframe is Safari or Chrome; Outlook desktop
            lays out with the Word engine and is the one that will surprise
            you.
          </li>
          <li>
            <span className="text-white/70">No images anywhere</span> — the
            wordmark is text in all five. No mail client renders SVG, and a PNG
            needs a public origin to be fetched from, which does not exist
            until the site is deployed.
          </li>
        </ul>
      </header>

      <div className="grid gap-x-8 gap-y-16 xl:grid-cols-2">
        {VARIANTS.map((variant, i) => (
          <Preview
            key={variant.id}
            label={i === 0 ? "00" : String.fromCharCode(64 + i)}
            name={variant.name}
            note={variant.note}
            html={variant.html(SAMPLE)}
            shipping={variant.id === DEFAULT_VARIANT}
          />
        ))}
      </div>

      {/* ── The other two things that get sent ───────────────────────── */}

      <div className="mt-24 grid gap-x-8 gap-y-16 border-t border-border pt-14 xl:grid-cols-2">
        <section className="flex flex-col">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-[11px] tracking-[0.18em] text-white/34 uppercase">
              Also
            </span>
            <h2 className="text-[21px] tracking-[-0.025em]">
              Team notification
            </h2>
          </div>
          <p className="mb-5 max-w-[70ch] text-[13.5px] leading-[1.6] font-light text-white/45">
            The other half of a signup, and the only copy of the list. Not
            trying to be beautiful — somebody has to scan forty of these, so it
            is four values and a reply-to and nothing else.
          </p>
          <div className="overflow-hidden rounded-xl border border-input bg-black">
            <iframe
              title="Team notification email"
              srcDoc={NOTIFICATION.html}
              className="block w-full"
              style={{ height: 380 }}
            />
          </div>
        </section>

        <section className="flex flex-col">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-[11px] tracking-[0.18em] text-white/34 uppercase">
              Also
            </span>
            <h2 className="text-[21px] tracking-[-0.025em]">
              The plain-text part
            </h2>
          </div>
          <p className="mb-5 max-w-[70ch] text-[13.5px] leading-[1.6] font-light text-white/45">
            Shared by all five, since the words do not change with the design.
            Not a fallback nobody sees — it is what a screen reader, a watch
            face and a spam filter read first.
          </p>
          <pre
            className={cn(
              "overflow-x-auto rounded-xl border border-input bg-card p-6",
              "font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap text-white/70",
            )}
          >
            {confirmationText(SAMPLE)}
          </pre>
        </section>
      </div>
    </main>
  );
}
