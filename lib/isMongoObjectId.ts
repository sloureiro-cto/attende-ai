/** True for 24-char hex Mongo ObjectId strings (not synthetic chat attachment ids). */
export function isMongoObjectId(value: string | undefined | null): boolean {
  const trimmed = value?.trim()
  return Boolean(trimmed && /^[a-f0-9]{24}$/i.test(trimmed))
}
