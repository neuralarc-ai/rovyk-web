/* ────────────────────────────────────────────────────────────────────
   Where the site lives.

   One origin, stated once. Everything that has to name the site by its
   full address — the canonical link, the Open Graph URLs, the footer of
   the confirmation email — reads it from here, so moving the domain is
   an env change and a redeploy rather than a grep for every place a
   hostname got typed in by hand.

   `NEXT_PUBLIC_` for the same reason `WAITLIST_MODE` is: the value has
   to survive into the browser bundle, not just the server. That carries
   the same two consequences spelled out in `lib/flags.ts` —

   - Next inlines the literal `process.env.NEXT_PUBLIC_…` expression
     below at build time, so this read must stay written out longhand;
     a dynamic lookup (`env[name]`) would NOT be inlined;
   - the value is frozen when `next build` runs. Changing it on the host
     without a rebuild changes nothing. Redeploy after a domain move.
   ──────────────────────────────────────────────────────────────────── */

/** Trailing slashes are the whole reason `//` shows up in a URL somebody
 *  built by concatenation. Strip them once, here, rather than at every
 *  call site — `absoluteUrl` and `new URL()` both add their own. */
function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * The canonical origin, without a trailing slash.
 *
 * The fallback is the current production domain rather than localhost on
 * purpose: an unset variable in a deploy should ship a wrong-but-real
 * link, not a `http://localhost:3000` that resolves to nothing in a
 * stranger's inbox or a search index. Set `NEXT_PUBLIC_SITE_URL` for
 * every environment that is not production — including preview builds,
 * or they will advertise themselves as the live site.
 *
 * `rovyk-web.vercel.app` is where the site serves from today. When it
 * moves to its own domain, set the env var on the host first — this
 * fallback is the safety net, not the switch.
 */
export const SITE_URL = normalizeOrigin(
  process.env.NEXT_PUBLIC_SITE_URL || "https://rovyk-web.vercel.app",
);

/**
 * The origin as a `URL`, which is the shape `metadataBase` wants.
 *
 * Constructing it here means a malformed `NEXT_PUBLIC_SITE_URL` fails
 * loudly at build with the bad value in the message, instead of quietly
 * emitting relative canonicals.
 */
export const SITE_ORIGIN = new URL(SITE_URL);

/**
 * The host on its own — `rovyk.com`. What a person would say out loud,
 * and what belongs in body copy where a full URL would read as a link
 * that isn't one.
 */
export const SITE_HOST = SITE_ORIGIN.host;

/**
 * An absolute URL for a path on this site, for the places that need one
 * spelled out in full: email bodies, `og:image`, anything leaving the
 * page. Inside the app, keep using relative hrefs — Next resolves those
 * against `metadataBase` already, and a hard-coded origin in a `<Link>`
 * is a full page load.
 */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}/${path.replace(/^\/+/, "")}`;
}
