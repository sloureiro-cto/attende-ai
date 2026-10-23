export const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

type DebouncedFn<TArgs extends any[]> = ((...args: TArgs) => void) & {
  cancel: () => void
  flush: () => void
}

export function debounceWithFlush<TArgs extends any[]>(
  func: (...args: TArgs) => void,
  wait: number
): DebouncedFn<TArgs> {
  let timeout: NodeJS.Timeout | null = null
  let lastArgs: TArgs | null = null

  const debounced = ((...args: TArgs) => {
    lastArgs = args
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      timeout = null
      if (lastArgs) func(...lastArgs)
      lastArgs = null
    }, wait)
  }) as DebouncedFn<TArgs>

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout)
    timeout = null
    lastArgs = null
  }

  debounced.flush = () => {
    if (!timeout || !lastArgs) return
    if (timeout) clearTimeout(timeout)
    timeout = null
    const args = lastArgs
    lastArgs = null
    func(...args)
  }

  return debounced
}
