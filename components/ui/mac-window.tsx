import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Wraps anything in a macOS window frame — a title bar with the three
 * controls, and a body below it.
 *
 * A wrapper rather than something baked into `Card`, so the plain card stays
 * plain and only the things that should read as windows get the chrome. It
 * can hold a card, a section, or raw markup.
 *
 * The controls sit grey and take their real colours on hover, which is what
 * the system does for an unfocused window. It keeps the page monochrome at
 * rest and makes the reference land when you reach for it.
 */
const WINDOW_CONTROLS = [
  { label: "Close", lit: "group-hover/window:bg-(--mac-close)" },
  { label: "Minimise", lit: "group-hover/window:bg-(--mac-minimise)" },
  { label: "Zoom", lit: "group-hover/window:bg-(--mac-zoom)" },
] as const

function MacWindowControls({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center gap-1.5", className)}>
      {WINDOW_CONTROLS.map((control) => (
        <span
          key={control.label}
          className={cn(
            "size-2.5 rounded-full bg-foreground/14 transition-colors duration-300",
            control.lit
          )}
        />
      ))}
    </span>
  )
}

function MacWindow({
  title,
  trailing,
  className,
  barClassName,
  children,
  ...props
  // `title` is omitted from the div props because the native attribute is a
  // string, and here it is the title bar's content.
}: Omit<React.ComponentProps<"div">, "title"> & {
  /** Sits beside the controls, in the title bar's left group. */
  title?: React.ReactNode
  /** Pushed to the far right of the title bar. */
  trailing?: React.ReactNode
  barClassName?: string
}) {
  return (
    <div
      data-slot="mac-window"
      className={cn(
        "group/window flex flex-col overflow-hidden rounded-[22px] border border-input bg-card",
        "transition-colors duration-300 hover:border-white/22",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "flex h-11 shrink-0 items-center gap-3 border-b border-border px-4",
          barClassName
        )}
      >
        <MacWindowControls />
        {title}
        {trailing ? <span className="ml-auto">{trailing}</span> : null}
      </div>
      {children}
    </div>
  )
}

export { MacWindow, MacWindowControls }
