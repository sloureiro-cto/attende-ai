/**
 * BlockNote treats `link` as inline content (`{ type: "link", href, content }`),
 * not a style. Agents and older injectors stored `{ styles: { link: url } }`,
 * which throws `style link not found in styleSchema` on editor create.
 */

const ALLOWED_STYLE_KEYS = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "textColor",
  "backgroundColor",
  "fontSize",
  "fontFamily",
])

type InlineItem = {
  type?: string
  text?: string
  styles?: Record<string, unknown>
  href?: string
  content?: unknown
  [key: string]: unknown
}

function filterStyles(styles: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!styles) return out
  for (const [key, value] of Object.entries(styles)) {
    if (key === "link") continue
    if (ALLOWED_STYLE_KEYS.has(key)) out[key] = value
  }
  return out
}

export function sanitizeInlineContent(content: unknown): unknown {
  if (!Array.isArray(content)) {
    if (content && typeof content === "object" && (content as { type?: string }).type === "tableContent") {
      return sanitizeTableContent(content as Record<string, unknown>)
    }
    return content
  }

  const out: InlineItem[] = []
  for (const item of content) {
    if (!item || typeof item !== "object") continue
    const rec = item as InlineItem
    if (rec.type === "link") {
      out.push({
        ...rec,
        type: "link",
        href: typeof rec.href === "string" ? rec.href : "",
        content: sanitizeInlineContent(rec.content ?? []) as InlineItem[],
      })
      continue
    }
    if (rec.type === "text") {
      const stylesIn = rec.styles && typeof rec.styles === "object" ? rec.styles : {}
      const href = stylesIn.link
      const styles = filterStyles(stylesIn)
      const text = typeof rec.text === "string" ? rec.text : ""
      if (typeof href === "string" && href.trim()) {
        out.push({
          type: "link",
          href,
          content: [{ type: "text", text, styles }],
        })
      } else {
        out.push({ type: "text", text, styles })
      }
      continue
    }
    out.push(rec)
  }
  return out
}

function sanitizeTableContent(content: Record<string, unknown>): Record<string, unknown> {
  const rows = content.rows
  if (!Array.isArray(rows)) return content
  return {
    ...content,
    rows: rows.map((row) => {
      if (!row || typeof row !== "object") return row
      const cells = (row as { cells?: unknown }).cells
      if (!Array.isArray(cells)) return row
      return {
        ...row,
        cells: cells.map((cell) => {
          if (!cell || typeof cell !== "object") return cell
          const c = cell as Record<string, unknown>
          return { ...c, content: sanitizeInlineContent(c.content) }
        }),
      }
    }),
  }
}

export function sanitizeBlockNoteBlocks<T>(blocks: T[]): T[] {
  if (!Array.isArray(blocks)) return blocks
  return blocks.map((block) => sanitizeBlock(block)) as T[]
}

function sanitizeBlock<T>(block: T): T {
  if (!block || typeof block !== "object") return block
  const rec = block as Record<string, unknown>
  const next: Record<string, unknown> = { ...rec }
  if (next.content !== undefined) {
    next.content = sanitizeInlineContent(next.content)
  }
  if (Array.isArray(next.children)) {
    next.children = next.children.map((child) => sanitizeBlock(child))
  }
  return next as T
}
