"use client";

import { useSyncExternalStore } from "react";

/**
 * The address that missed, read back verbatim.
 *
 * The one thing here that cannot be rendered on the server: the page is
 * prerendered once, at `/_not-found`, and that one document then serves
 * every unmatched URL there is. `usePathname()` would bake `/_not-found`
 * into it at build and disagree with the browser on hydration, so the
 * location is read as what it actually is — an external value React does
 * not own — with the server snapshot left empty so hydration matches the
 * HTML before swapping in the real one.
 *
 * Nothing to subscribe to: the URL cannot change without this page being
 * torn down, so the subscribe callback is a no-op.
 */
const subscribe = () => () => {};
const readLocation = () => window.location.pathname;
const readNothing = () => "";

export function MissedRoute() {
  const path = useSyncExternalStore(subscribe, readLocation, readNothing);

  return (
    <p className="mt-7 max-w-full truncate font-mono text-[13px] text-white/40">
      {path}
    </p>
  );
}
