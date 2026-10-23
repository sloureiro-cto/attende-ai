import { IUser } from "app/_types/User"
import { filterPersonMatchesSearch, userToFilterPerson } from "lib/filters/filterPerson"

type UserLike = Pick<IUser, "_id"> & Partial<IUser>

export function getUserIdString(user: UserLike): string | null {
  const id = user._id
  if (id == null || id === "") return null
  return String(id)
}

export function getUserDisplayName(user: UserLike): string {
  return (user.fullName || user.name || user.username || user.email || "").trim() || user._id
}

export function userMatchesSearch(user: UserLike, query: string): boolean {
  const person = userToFilterPerson(user as Parameters<typeof userToFilterPerson>[0])
  if (!person) return false
  return filterPersonMatchesSearch(person, query)
}

/** Picker display: "maria DA silva" → "Maria Da Silva". */
export function formatPersonName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("pt-BR"))
}

/** Picker display: "suporte" → "Suporte"; the rest is kept so acronyms like "SDR" survive. */
export function formatRoleLabel(role: string): string {
  const trimmed = role.trim()
  return trimmed.charAt(0).toLocaleUpperCase("pt-BR") + trimmed.slice(1)
}

/** Pickers: already-selected entries first (easy to uncheck), then alphabetical. */
export function sortForPicker<T>(items: T[], getName: (item: T) => string, isSelected: (item: T) => boolean): T[] {
  return [...items].sort(
    (a, b) =>
      Number(isSelected(b)) - Number(isSelected(a)) ||
      getName(a).localeCompare(getName(b), "pt-BR", { sensitivity: "base" })
  )
}
