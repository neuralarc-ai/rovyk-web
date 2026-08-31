# bloub — vendored

Third-party code, copied in verbatim. **Do not edit these files.**

| | |
| --- | --- |
| Source | https://github.com/jeremy-prt/bloub |
| Path | `src/bot/` |
| Commit | `b4bb3c1b5f93c7b87a2e8d620f667c4093d97749` (2026-08-17) |
| Licence | MIT |
| Author | Jérémy Prt |

An SVG recreation of the x.ai bot avatar: one shape morphing through fourteen
states, measured off the reference video frame by frame. No animation library,
no dependencies.

## Why it is here at all

A temporary stand-in for `thinking-orbs` in `components/orb-section.tsx`, to see
whether the blob reads better than the dot orb before committing to it anywhere
else. `<HeroOrb>` is untouched and still drives the hero, the HUD, the focus demo
and the CTA — so backing this out is one import in `orb-section.tsx`.

**It is a recreation of someone else's mark.** Fine for a look; not something to
ship as brand identity without a conversation first.

## Why it could be vendored at all

The upstream project is Vue, but `src/bot/` is not: the author separates the
engine from its renderer deliberately, and says so in `repere.ts` — *"`src/bot/`
is what gets read and consumed from outside: the Vue component is ONE client of
the engine, not its definition."*

Verified before copying: no `vue` import in any file, no third-party import in
any file, and no import that leaves this directory. `components/blob-orb.tsx` is
our own second client of it.

There is no npm package (the name 404s on the registry), so this is a copy, not a
dependency — no upgrade path but the one you do by hand.

## What was left out

`src/bot/cycles.ts` — the timeline player's block model. Nothing else in the
folder imports it, and we drive the state directly from scroll position rather
than playing a montage.

## Comments are in French

Left as they are. Vendored code stays byte-identical to its source so the diff
against upstream is auditable and deleting the folder is the whole of the
removal. The English commentary is in `components/blob-orb.tsx`, which is ours.

## The two numbers that matter

From `repere.ts`, since nothing the engine returns means anything without them:

- `RAYON = 100` — radius of the ball at rest, in viewBox units. This is the
  `scale` handed to `BotEngine`.
- `DEMI_VIEWBOX = 158` — half-side of the viewBox. The margin past the radius is
  where the orbit rings live.
