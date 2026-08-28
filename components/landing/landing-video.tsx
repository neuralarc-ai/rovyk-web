import Image from "next/image";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr";
import heroWall from "@/public/assets/hero-wall.jpg";

/**
 * The page's dominant element, and for now a placeholder: a poster frame
 * with no `<video>` behind it yet. Reuses the hero wallpaper rather than
 * a blank box, so the slot reads as "a video is meant to be here" rather
 * than "something is missing." Swapping in a real file later — a
 * `<video src>` with this same poster — is a contained change to this
 * one component; nothing outside it needs to know the difference.
 */
export function LandingVideo() {
  return (
    <div className="flex justify-center px-6 sm:px-10">
      <div
        className="relative aspect-16/9 w-full overflow-hidden rounded-3xl bg-background shadow-[0_0_0_1px_rgba(255,255,255,.18),0_0_0_6px_rgba(255,255,255,.035),0_40px_90px_-30px_rgba(0,0,0,.9)]"
        style={{ maxWidth: "min(1100px, 78vw)" }}
      >
        <Image
          src={heroWall}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1100px) 1100px, 78vw"
          placeholder="blur"
          className="object-cover object-[center_42%]"
        />
        <div className="absolute inset-0 bg-black/38" />

        {/* Decorative, not a control — there is nothing to play yet. A
            non-functional button would be a worse affordance than none. */}
        <div aria-hidden className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur-sm sm:size-20">
            <PlayIcon
              weight="fill"
              className="size-6 translate-x-0.5 text-white/85 sm:size-7"
            />
          </span>
        </div>
      </div>
    </div>
  );
}
