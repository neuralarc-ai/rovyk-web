import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/* ────────────────────────────────────────────────────────────────────
   robots.txt.

   Everything is open. The site is three public marketing pages and the
   whole point is to be found, so there is nothing here that wants
   hiding — and a `Disallow` on a pre-release product would be the kind
   of quiet own-goal nobody notices for a quarter.

   The one exclusion is `/api/`, which is not a secret and not protected
   by this: robots.txt is a request, not a control, and anything that
   actually needs guarding is guarded in the route. It is here because
   `/api/waitlist` answers POST only, so a crawler that follows it gets
   a 405 and learns nothing — a wasted request on both sides.
   ──────────────────────────────────────────────────────────────────── */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    // Absolute by spec: a crawler will not resolve a relative sitemap
    // reference, and this is the one line that points it at the rest.
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
