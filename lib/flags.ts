/* ────────────────────────────────────────────────────────────────────
   Build-time flags.

   Two of them: whether the site is still asking people to wait or has
   something for them to download, and whether it is allowed to speak.

   The first decides the label on every primary call to action on the
   page, so it lives here rather than in the components — a page that
   offered a download in the hero and a waitlist in the footer would be
   a page nobody trusts. The second gates a whole feature, and is off
   unless a build asks for it.

   `NEXT_PUBLIC_` because the CTAs render in both server and client
   components and the value has to survive into the bundle. Next inlines
   the literal `process.env.NEXT_PUBLIC_…` expression below at build
   time, which has two consequences worth knowing:

   - a dynamic lookup (`env[name]`) would NOT be inlined, so this read
     must stay written out longhand;
   - the value is frozen when `next build` runs. Flipping it on the host
     without a rebuild changes nothing. Redeploy to switch modes.
   ──────────────────────────────────────────────────────────────────── */

/**
 * True while the product is pre-release: every download button becomes
 * "Join the waitlist" and opens the signup dialog instead of pointing at
 * a binary that does not exist yet.
 */
export const WAITLIST_MODE = process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";

/**
 * True when the page is allowed to speak.
 *
 * Covers the whole feature, not a piece of it: the narration dock on
 * `/rovyk` is not mounted at all, and the intro splash never loads its
 * two clips. Both already have a complete silent path — the intro types
 * the ask at a guessed rate and reveals the reply on a stagger, exactly
 * as it did before there was any audio — so switching this off is a
 * page with no voice rather than a page with a voice that fails.
 *
 * Off unless explicitly enabled, which is the right default for
 * something that makes noise. Set `NEXT_PUBLIC_VOICE_MODE=true` in
 * `.env.local` to hear it, and remember the value is frozen at build:
 * flipping it on the host without a redeploy changes nothing.
 */
export const VOICE_MODE = process.env.NEXT_PUBLIC_VOICE_MODE === "true";
