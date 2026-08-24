import { z } from "zod";

/* ────────────────────────────────────────────────────────────────────
   Form schemas, shared by the browser and the route handler.

   One schema, three uses: per field while someone is typing, over the
   whole object when they submit, and again on the server. The third is
   not redundant — a browser is not the only thing that can POST to
   `/api/waitlist`, so the route never trusts what the client says it
   validated.
   ──────────────────────────────────────────────────────────────────── */

export const nameSchema = z.string().trim().min(1, "A name is required.");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "An email address is required.")
  .pipe(z.email("That is not a complete email address."));

/** Optional by design — an empty box is not an error. The cap is only
 *  there so a paste of someone's novel cannot become the email body. */
export const optionalText = z
  .string()
  .trim()
  .max(280, "Keep it under 280 characters.");

export const waitlistSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  /** Which Mac. Worth asking: Rovyk is Apple Silicon only, and knowing
   *  how many people on the list are on Intel is the difference between
   *  a footnote and a problem. */
  mac: optionalText,
  /** What they would hand it first. Free text, never required. */
  use: optionalText,
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

/**
 * Turns a field schema into the `(value) => error | null` shape the
 * inputs want, so a field does not have to know it is using zod.
 */
export function validatorFor(schema: z.ZodType<unknown, string>) {
  return (value: string): string | null => {
    const result = schema.safeParse(value);
    return result.success
      ? null
      : (result.error.issues[0]?.message ?? "That is not valid.");
  };
}

/** The one message worth showing above a submit button. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form.";
}
