"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The one interactive thing in the footer, split out so the footer
   itself stays a server component.

   ⚠ Not wired to anything. Submitting validates the address and says
   so, and that is all — there is no list, no endpoint, and nothing is
   stored. Point `subscribe` at the provider before this page ships, or
   take the form out; a box that thanks people for joining a list that
   does not exist is the one dishonest thing on a page whose whole
   argument is that it tells you the truth about itself.
   ──────────────────────────────────────────────────────────────────── */

/** Deliberately loose. Address syntax is not worth policing in a browser —
 *  the only mistakes worth catching here are the obvious ones, and the list
 *  provider is the thing that actually decides. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REST = "Release notes and changelog. Nothing else.";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);

  return (
    <>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const value = email.trim();
          const ok = LOOKS_LIKE_EMAIL.test(value);
          setNote({
            ok,
            text: ok
              ? "Added. You will only hear from us on release days."
              : "That does not look like an email address.",
          });
          if (ok) setEmail("");
        }}
        className="flex max-w-107.5 gap-2.5"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          aria-label="Email address"
          aria-invalid={note ? !note.ok : undefined}
          className="h-12 flex-1 rounded-xl border border-input bg-card px-4 text-sm text-white transition-colors duration-200 outline-none placeholder:text-white/40 hover:border-white/24 focus-visible:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <button
          type="submit"
          className="h-12 cursor-pointer rounded-xl bg-primary px-6 text-[14.5px] font-medium text-primary-foreground transition-[transform,background] duration-200 hover:-translate-y-px hover:bg-primary/90 active:translate-y-0 active:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Join
        </button>
      </form>

      {/* One line that is either the promise or the answer, so the result
          lands where the reader was already looking rather than appearing
          somewhere new. Polite, not assertive — nobody needs interrupting
          to be told an address was accepted. */}
      <p
        aria-live="polite"
        className={cn(
          "mt-3 font-mono text-xs tracking-[0.02em] transition-colors duration-200",
          !note && "text-white/40",
          note?.ok && "text-brand-green-text",
          note?.ok === false && "text-brand-red-text",
        )}
      >
        {note?.text ?? REST}
      </p>
    </>
  );
}
