"use client"

import React, { HTMLAttributes, useLayoutEffect, useRef, useState } from "react"

interface Props extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  light?: string
  dark?: string
  // When the background color can change (e.g. label badges), pass it so contrast
  // is recalculated immediately instead of waiting for a remount.
  bgColor?: string
}

function getLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const channel = c / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  }

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function parseCssColor(color: string): [number, number, number] | null {
  const value = color.trim()

  if (value.startsWith("#")) {
    let hex = value.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .slice(0, 3)
        .split("")
        .map((char) => char + char)
        .join("")
    } else if (hex.length === 8) {
      hex = hex.slice(0, 6)
    }

    if (hex.length !== 6) return null

    const numeric = Number.parseInt(hex, 16)
    if (Number.isNaN(numeric)) return null

    return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255]
  }

  const rgb = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  }

  return null
}

function contrastColor(background: string, light: string, dark: string): string {
  const rgb = parseCssColor(background)
  if (!rgb) return dark

  return getLuminance(...rgb) > 0.5 ? dark : light
}

function findBackgroundColor(element: HTMLElement | null): string {
  while (element) {
    const bg = window.getComputedStyle(element).backgroundColor
    if (bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
      return bg
    }
    element = element.parentElement
  }

  return "rgb(255, 255, 255)"
}

export const ContrastText = ({ children, light = "#fff", dark = "#000", bgColor, style, ...props }: Props) => {
  const ref = useRef<HTMLSpanElement>(null)
  const colorFromBg = bgColor ? contrastColor(bgColor, light, dark) : undefined
  const [measuredColor, setMeasuredColor] = useState<string>(dark)

  useLayoutEffect(() => {
    if (colorFromBg) return
    if (!ref.current) return

    setMeasuredColor(contrastColor(findBackgroundColor(ref.current), light, dark))
  }, [light, dark, bgColor, colorFromBg])

  return (
    <span {...props} ref={ref} style={{ ...style, color: colorFromBg ?? measuredColor }}>
      {children}
    </span>
  )
}
