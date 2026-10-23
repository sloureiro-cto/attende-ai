export const toQueryUrl = (obj: Record<string, any>, prefix = ""): string => {
  return Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .map((key) => {
      const value = obj[key]
      const prefixedKey = prefix ? `${prefix}.${key}` : key

      // Handle arrays (e.g., sprintIds[]=id1&sprintIds[]=id2)
      if (Array.isArray(value)) {
        return value
          .map((item) => `${encodeURIComponent(prefixedKey)}[]=${encodeURIComponent(item as string)}`)
          .join("&")
      }

      if (value !== null && typeof value === "object") {
        return toQueryUrl(value, prefixedKey)
      }

      return `${encodeURIComponent(prefixedKey)}=${encodeURIComponent(value)}`
    })
    .filter(Boolean)
    .join("&")
}
