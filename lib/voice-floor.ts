/* ────────────────────────────────────────────────────────────────────
   One voice at a time.

   Two things on this page can speak, and they know nothing about each
   other by design: the intro splash runs its own two clips off a GSAP
   timeline, and the narration dock runs a track per section off its own
   player. Both are correct on their own. Together, a visitor who
   pressed Listen Instead while the splash was still talking heard both
   at once.

   Rather than teach either one about the other — which would tie the
   splash's timeline to the conductor's state machine for the sake of a
   single edge — this is the smallest thing that fixes it: a floor that
   only one speaker holds. Taking it tells whoever had it to stop.

   Deliberately not a React context. One of the two callers is inside a
   GSAP timeline callback rather than a render, both are single
   instances for the life of the page, and neither needs to re-render
   when the other speaks.
   ──────────────────────────────────────────────────────────────────── */

/** What the current speaker does when something else wants the floor. */
type Silence = () => void;

let holder: Silence | null = null;

/**
 * Take the floor, stopping whoever has it.
 *
 * Returns a release for the caller to use when it finishes on its own.
 * The release is a no-op if the floor has moved on in the meantime, so
 * a track that ends after being interrupted cannot silence its
 * successor.
 */
export function takeFloor(silence: Silence): () => void {
  if (holder && holder !== silence) holder();
  holder = silence;
  return () => {
    if (holder === silence) holder = null;
  };
}

/** Stop whoever is speaking, without taking the floor. For teardown. */
export function clearFloor(): void {
  holder?.();
  holder = null;
}
