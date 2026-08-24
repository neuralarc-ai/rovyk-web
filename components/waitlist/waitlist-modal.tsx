"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import {
  emailSchema,
  firstIssue,
  nameSchema,
  optionalText,
  validatorFor,
  waitlistSchema,
} from "@/lib/validators";

/* ────────────────────────────────────────────────────────────────────
   The waitlist dialog.

   Two required fields and two optional ones. The optional pair is not
   filler: Rovyk is Apple Silicon only, so knowing what people are
   actually running is the difference between a footnote and a problem,
   and "what would you hand it first" is the one answer that tells us
   whether the pitch landed.

   Built on Base UI's Dialog rather than by hand, which is what supplies
   the portal, the focus trap, Escape, the backdrop click and the aria
   wiring. The portal matters more than it looks: the sheet sets
   `isolate` and the hero runs live transforms, and either one creates a
   stacking context that would cap an in-tree overlay underneath the
   notch nav.
   ──────────────────────────────────────────────────────────────────── */

/* Built once, at module scope. A validator with a fresh identity every
   render is a validator every field has to treat as new, which is how
   you get validation that re-runs on each keystroke of a form nobody has
   finished typing into yet. */
const FIELDS = [
  {
    name: "name",
    label: "Name",
    placeholder: "Ada Lovelace",
    autoComplete: "name",
    type: "text",
    required: true,
    validate: validatorFor(nameSchema),
  },
  {
    name: "email",
    label: "Email",
    placeholder: "you@example.com",
    autoComplete: "email",
    type: "email",
    required: true,
    validate: validatorFor(emailSchema),
  },
  {
    name: "mac",
    label: "Which Mac",
    placeholder: "M2 MacBook Air, 16 GB",
    autoComplete: "off",
    type: "text",
    required: false,
    validate: validatorFor(optionalText),
  },
  {
    name: "use",
    label: "What would you hand it first?",
    placeholder: "Tidying my Downloads folder, mostly",
    autoComplete: "off",
    type: "text",
    required: false,
    validate: validatorFor(optionalText),
  },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];
type Values = Record<FieldName, string>;

const EMPTY: Values = { name: "", email: "", mac: "", use: "" };

/** Long enough to outlast the exit transition below, so the fields do not
 *  visibly empty out while the dialog is still on screen. */
const RESET_MS = 300;

const INPUT =
  "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-white transition-colors duration-200 outline-none placeholder:text-white/32 hover:border-white/24 focus-visible:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-brand-red/60";

export function WaitlistModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [visited, setVisited] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  /* The honeypot. Off-screen and unlabelled, so nobody can fill it in by
     accident; kept out of the zod schema on purpose, since the server
     reads it off the raw body before parsing. */
  const honeypot = useRef("");
  const firstField = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setValues(EMPTY);
      setErrors({});
      setVisited({});
      setStatus("idle");
      setFormError(null);
      honeypot.current = "";
    }, RESET_MS);
    return () => clearTimeout(t);
  }, [open]);

  const set = (name: FieldName, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // A field only speaks up once it has been left. After that it keeps
    // talking, so a correction clears the message as it is made rather
    // than on the next blur.
    if (visited[name]) {
      const field = FIELDS.find((f) => f.name === name)!;
      setErrors((prev) => ({ ...prev, [name]: field.validate(value) ?? "" }));
    }
  };

  const leave = (name: FieldName) => {
    setVisited((prev) => ({ ...prev, [name]: true }));
    const field = FIELDS.find((f) => f.name === name)!;
    setErrors((prev) => ({
      ...prev,
      [name]: field.validate(values[name]) ?? "",
    }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;

    /* Catches the form sent without touching anything — every field is
       still unvisited at that point, so nothing has had reason to
       complain yet. */
    const parsed = waitlistSchema.safeParse(values);
    if (!parsed.success) {
      setVisited({ name: true, email: true, mac: true, use: true });
      setErrors(
        Object.fromEntries(
          FIELDS.map((f) => [f.name, f.validate(values[f.name]) ?? ""]),
        ) as Partial<Record<FieldName, string>>,
      );
      setFormError(firstIssue(parsed.error));
      return;
    }

    setFormError(null);
    setStatus("sending");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, company: honeypot.current }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setFormError(
          typeof body?.error === "string"
            ? body.error
            : "Something went wrong. Please try again.",
        );
        setStatus("idle");
        return;
      }

      setStatus("done");
    } catch {
      setFormError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-200 bg-black/72 backdrop-blur-sm transition-opacity duration-250 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />

        <Dialog.Popup
          initialFocus={firstField}
          className={cn(
            "fixed top-1/2 left-1/2 z-200 w-[min(30rem,calc(100vw-2.5rem))] -translate-x-1/2 -translate-y-1/2",
            "max-h-[calc(100dvh-2.5rem)] overflow-y-auto overscroll-contain",
            "rounded-3xl border border-input bg-card p-7 text-white shadow-[0_40px_90px_-30px_rgba(0,0,0,.9)] sm:p-8",
            "transition-[opacity,scale] duration-250 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0",
            "motion-reduce:transition-none",
          )}
        >
          {status === "done" ? (
            <>
              <Dialog.Title className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">
                You are on the list.
              </Dialog.Title>
              <Dialog.Description className="mt-3.5 text-[14.5px] leading-[1.6] font-light text-white/68">
                Check your inbox: there is a note confirming it. Invites go
                out in batches as seats open, and yours will arrive at the same
                address.
              </Dialog.Description>

              <Dialog.Close className="mt-7 h-11.5 w-full cursor-pointer rounded-xl bg-primary text-[14.5px] font-medium text-primary-foreground transition-[transform,background] duration-200 hover:-translate-y-px hover:bg-primary/90 active:translate-y-0 active:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                Close
              </Dialog.Close>
            </>
          ) : (
            <>
              <Dialog.Title className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">
                Join the waitlist
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-[14.5px] leading-[1.6] font-light text-white/68">
                Rovyk is not out yet. Leave an address and we will write when
                there is a build worth your time. No date invented, no
                newsletter.
              </Dialog.Description>

              <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-4">
                {FIELDS.map((field, index) => {
                  const error = visited[field.name]
                    ? (errors[field.name] ?? "")
                    : "";
                  return (
                    <div key={field.name} className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`waitlist-${field.name}`}
                        className="text-xs font-medium tracking-[0.01em] text-white/60"
                      >
                        {field.label}
                        {!field.required && (
                          <span className="text-white/32"> (optional)</span>
                        )}
                      </label>
                      <input
                        ref={index === 0 ? firstField : undefined}
                        id={`waitlist-${field.name}`}
                        name={field.name}
                        type={field.type}
                        value={values[field.name]}
                        placeholder={field.placeholder}
                        autoComplete={field.autoComplete}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={
                          error ? `waitlist-${field.name}-error` : undefined
                        }
                        onChange={(e) => set(field.name, e.target.value)}
                        onBlur={() => leave(field.name)}
                        className={INPUT}
                      />
                      {error && (
                        <p
                          id={`waitlist-${field.name}-error`}
                          className="font-mono text-[11.5px] tracking-[0.02em] text-brand-red-text"
                        >
                          {error}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Honeypot. Moved off-screen rather than `display:none` —
                    the naive bots this catches skip hidden fields but do
                    fill in positioned ones. Never announced, never tabbed
                    to, never a real person's problem. */}
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  onChange={(e) => (honeypot.current = e.target.value)}
                  className="pointer-events-none absolute -left-[9999px] size-px opacity-0"
                />

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="mt-1 h-11.5 cursor-pointer rounded-xl bg-primary text-[14.5px] font-medium text-primary-foreground transition-[transform,background,opacity] duration-200 hover:-translate-y-px hover:bg-primary/90 active:translate-y-0 active:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60"
                >
                  {status === "sending" ? "Adding you…" : "Join the waitlist"}
                </button>

                {/* Polite, not assertive: nobody needs interrupting to be
                    told a form failed while they are still in it. */}
                <p
                  aria-live="polite"
                  className={cn(
                    "min-h-4 font-mono text-[11.5px] tracking-[0.02em]",
                    formError ? "text-brand-red-text" : "text-transparent",
                  )}
                >
                  {formError ?? " "}
                </p>
              </form>

              {/* Art. 13 is discharged at the point of collection, not by a
                  policy linked from a footer three screens away. Who is
                  collecting, what for, and where the detail lives. */}
              <p className="mt-1 text-[11.5px] leading-[1.55] text-white/36">
                Neural Arc, Inc. stores what you type here only to email you
                about Rovyk. No list provider, no tracking, no other use. Ask
                us to delete it at any time; see the{" "}
                <Link
                  href="/privacy"
                  className="border-b border-input pb-px text-white/58 transition-colors hover:border-brand-indigo hover:text-white"
                >
                  privacy policy
                </Link>
                .
              </p>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
