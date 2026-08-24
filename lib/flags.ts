/* ────────────────────────────────────────────────────────────────────
   Build-time flags.

   One flag, for now: whether the site is still asking people to wait or
   has something for them to download. It decides the label on every
   primary call to action on the page, so it lives here rather than in
   the components — a page that offered a download in the hero and a
   waitlist in the footer would be a page nobody trusts.

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
