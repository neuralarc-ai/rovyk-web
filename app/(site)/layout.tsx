import type { ReactNode } from "react";
import { NotchNav } from "@/components/notch-nav";

/**
 * Everything that is "the current site" — `/rovyk`, `/privacy`, `/terms` —
 * shares this one nav. The new landing page at `/` sits outside this
 * group entirely and never renders `NotchNav`.
 *
 * Typed as plain `{ children: ReactNode }` rather than the generated
 * `LayoutProps<'/rovyk'>` helper the root layout uses: this layout is
 * shared across three sibling routes under a route group, not the
 * single literal path that helper names, and it has no params of its
 * own to type either way.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NotchNav />
      {children}
    </>
  );
}
