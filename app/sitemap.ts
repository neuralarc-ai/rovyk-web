import type { MetadataRoute } from "next";
import { PRIVACY } from "@/lib/legal-privacy";
import { updatedAt } from "@/lib/legal";
import { TERMS } from "@/lib/legal-terms";
import { SITE_URL, absoluteUrl } from "@/lib/site";

/* ────────────────────────────────────────────────────────────────────
   The sitemap.

   Four pages, so this is a list rather than anything generated — and a
   list is the right shape while it stays this short: a route that goes
   missing from here is a route somebody deleted, which is a diff worth
   reading. Revisit if the site ever grows a blog.

   Every URL is built with `absoluteUrl`, so the origin comes from
   `NEXT_PUBLIC_SITE_URL` like everywhere else. A sitemap is the one file
   where a stale hostname is silent: crawlers fetch it, find URLs on a
   domain that no longer serves the site, and quietly drop the pages.
   ──────────────────────────────────────────────────────────────────── */

/* The marketing page has no authored revision date and genuinely does
   change whenever the site is rebuilt, so build time is the honest
   answer for it. The legal pages have a real one, printed at the top of
   each document — that is the date to give a crawler, not the moment CI
   happened to run. */
const BUILT_AT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // `SITE_URL`, not `absoluteUrl("/")`, so this is byte-identical to
      // the canonical the page emits. The two are equivalent for a root
      // path, but a sitemap that disagrees with a canonical is a thing
      // somebody eventually has to rule out.
      url: SITE_URL,
      lastModified: BUILT_AT,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/rovyk"),
      lastModified: BUILT_AT,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: updatedAt(PRIVACY),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: updatedAt(TERMS),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
