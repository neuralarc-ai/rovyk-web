"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
