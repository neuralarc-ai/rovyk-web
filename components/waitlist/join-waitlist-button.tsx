"use client";

import { useWaitlist } from "@/components/waitlist/waitlist-provider";

/* ────────────────────────────────────────────────────────────────────
   The control that opens the dialog, with no opinion about how it looks.

   Every caller already has a button style — the hero's primary fill, the
   footer's, the big lit one in the surfaces section — so this takes the
   className rather than supplying one. All it contributes is the click.

   A `<button>`, not an anchor: it goes nowhere. The old download CTA was
   an anchor because a download is a navigation; this opens something in
   place, and an anchor would promise a destination that does not exist
   and hand the middle-click a `#`.
   ──────────────────────────────────────────────────────────────────── */

export function JoinWaitlistButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useWaitlist();

  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
