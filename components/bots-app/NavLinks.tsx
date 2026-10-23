"use client"

import { PrimaryNav } from "./nav/PrimaryNav"

/** Kept as the shell's nav entry point; the items and active-state logic live in `./nav`. */
export function NavLinks({ className }: { className?: string }) {
  return <PrimaryNav className={className} />
}
