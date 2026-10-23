import type { ILabel } from "app/_types/Label"

export const LABEL_TEXT_MAX = 60
const HEX = /^#[0-9a-f]{6}$/i

/** Name + colour of a picked label (the bot stores the name; colour is only for creating it elsewhere). */
export function labelSelectionPatch(label: Pick<ILabel, "text" | "color">, projectId: string) {
  const color = HEX.test(label.color ?? "") ? label.color : undefined
  return { labelText: label.text.trim().slice(0, LABEL_TEXT_MAX), labelColor: color, projectId }
}

/** Same name = same label (the runtime matches case-insensitively, so the picker does too). */
export function isSameLabel(a: string | undefined, b: string | undefined): boolean {
  const x = (a ?? "").trim().toLowerCase()
  return x.length > 0 && x === (b ?? "").trim().toLowerCase()
}

export function selectedLabelOf(labels: ILabel[], labelText: string): ILabel | undefined {
  return labels.find((l) => isSameLabel(l.text, labelText))
}

/** Labels first matching the search, selected one on top (easy to spot and replace). */
export function visibleLabels(labels: ILabel[], query: string, selectedText: string): ILabel[] {
  const q = query.trim().toLowerCase()
  const filtered = q ? labels.filter((l) => l.text.toLowerCase().includes(q)) : labels
  return [...filtered].sort((a, b) => Number(isSameLabel(b.text, selectedText)) - Number(isSameLabel(a.text, selectedText)))
}
