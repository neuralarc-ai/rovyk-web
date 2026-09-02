"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { WaitlistModal } from "@/components/waitlist/waitlist-modal";
import { getLenis } from "@/components/smooth-scroll";

/* ────────────────────────────────────────────────────────────────────
   One dialog for the whole site.

   Every primary CTA on the page makes the same offer, so they open the
   same dialog rather than each mounting their own — and rather than the
   older answer, which was to anchor-jump down to a form section and
   make the reader find it again.

   Mounted above the nav in `app/layout.tsx`, so anything on any page can
   call `useWaitlist().open()`.
   ──────────────────────────────────────────────────────────────────── */

type WaitlistContext = { open: () => void };

const Context = createContext<WaitlistContext | null>(null);

/**
 * Opens the waitlist dialog. Throws rather than no-oping if the provider
 * is missing — a CTA that silently does nothing is the exact failure this
 * page cannot afford.
 */
export function useWaitlist(): WaitlistContext {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useWaitlist must be used inside <WaitlistProvider>.");
  }
  return context;
}

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  /* Base UI locks body scroll while the dialog is up, but Lenis does not
     scroll the body — it animates scroll position itself, on its own
     ticker, so `overflow: hidden` is not something it ever reads. Without
     this the page glides along behind the backdrop under the wheel. */
  const change = useCallback((next: boolean) => {
    const lenis = getLenis();
    if (next) lenis?.stop();
    else lenis?.start();
    setOpen(next);
  }, []);

  /* A link inside the dialog is still a navigation, and this provider sits
     in the root layout — it does not unmount when the route changes, so
     nothing was closing the dialog behind you. The privacy policy link in
     the collection notice is the one that has to work: it is there because
     Art. 13 wants the policy reachable at the point of collection, and it
     was leaving the dialog floating over the page it had just opened.

     Keyed off the path rather than wired into that one link, so any link
     the dialog ever grows behaves the same. */
  const pathname = usePathname();
  const landed = useRef(pathname);
  useEffect(() => {
    if (pathname === landed.current) return;
    landed.current = pathname;
    change(false);
  }, [pathname, change]);

  /* Only `open` is exposed, and it is stable — consumers are buttons, and
     a button has no reason to re-render because a dialog it is not inside
     was toggled. */
  const value = useMemo(() => ({ open: () => change(true) }), [change]);

  return (
    <Context value={value}>
      {children}
      <WaitlistModal open={open} onOpenChange={change} />
    </Context>
  );
}
