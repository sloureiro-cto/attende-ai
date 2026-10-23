import { toQueryUrl } from "app/utils/toQueryUrl"
import { auth } from "auth"

export class HttpError extends Error {
  public status: number
  public details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details

    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

type HttpOptions = {
  query?: any
  withoutToken?: boolean
  optionalToken?: boolean
  next?: { revalidate?: number; tags?: string[] }
}

/**
 * Reads never wait forever. Next runs the router and server actions through one queue, so a read
 * that hangs inside a polled action holds every later navigation (the page then stays on its
 * loading skeleton until reload). A caller that needs longer passes its own `signal`.
 */
export const READ_TIMEOUT_MS = 30_000

/** Aborts with a `TimeoutError` after `ms` (`AbortSignal.timeout` where the runtime has it). */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException("The operation timed out", "TimeoutError")), ms)
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true })
  return controller.signal
}

export class FetchClient {
  public static async get<T>(url: string, options: HttpOptions & Omit<RequestInit, "method"> = {}): Promise<T> {
    "use server"
    const { next, ...restOptions } = options
    const queryString = restOptions.query ? toQueryUrl(restOptions.query) : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url
    let response: Response
    try {
      response = await fetch(fullUrl, {
        ...(await this._getOptions(
          { signal: timeoutSignal(READ_TIMEOUT_MS), ...restOptions },
          "GET",
          restOptions.withoutToken,
          restOptions.optionalToken
        )),
        ...(next && { next }),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new HttpError("Request timed out", 504)
      }
      throw error
    }

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  /**
   * Performs an authenticated request and returns the raw `Response`.
   * Useful for non-JSON payloads (files, streams, ArrayBuffers, etc).
   */
  public static async getRaw(url: string, options: HttpOptions & Omit<RequestInit, "method"> = {}): Promise<Response> {
    "use server"
    const { next, ...restOptions } = options
    const queryString = restOptions.query ? toQueryUrl(restOptions.query) : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url
    const response = await fetch(fullUrl, {
      ...(await this._getOptions(restOptions, "GET", restOptions.withoutToken, restOptions.optionalToken)),
      ...(next && { next }),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    return response
  }

  public static async post<T, B = undefined>(
    url: string,
    body: B | any,
    options: HttpOptions & Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    "use server"
    const { next, ...restOptions } = options
    const queryString = restOptions.query ? toQueryUrl(restOptions.query) : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url
    const response = await fetch(fullUrl, {
      ...(await this._getOptions(
        { ...restOptions, body: JSON.stringify(body) },
        "POST",
        restOptions.withoutToken,
        restOptions.optionalToken
      )),
      ...(next && { next }),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  public static async put<T, B = undefined>(
    url: string,
    body?: B | any,
    options: HttpOptions & Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    "use server"
    const { next, ...restOptions } = options
    const queryString = restOptions.query ? toQueryUrl(restOptions.query) : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url
    const bodyString = body !== undefined && body !== null ? JSON.stringify(body) : "{}"

    const init = await this._getOptions(
      { ...restOptions, body: bodyString },
      "PUT",
      restOptions.withoutToken,
      restOptions.optionalToken
    )
    const response = await fetch(fullUrl, {
      ...init,
      method: "PUT",
      ...(next && { next }),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  public static async patch<T, B = undefined>(
    url: string,
    body: B | any,
    options: HttpOptions & Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    "use server"
    const { next, ...restOptions } = options
    const queryString = restOptions.query ? toQueryUrl(restOptions.query) : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url

    const response = await fetch(fullUrl, {
      ...(await this._getOptions(
        { ...restOptions, body: JSON.stringify(body) },
        "PATCH",
        restOptions.withoutToken,
        restOptions.optionalToken
      )),
      ...(next && { next }),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  public static async delete<T>(url: string, options: HttpOptions & Omit<RequestInit, "method"> = {}): Promise<T> {
    "use server"
    const { next, ...restOptions } = options
    const queryString = restOptions.query ? toQueryUrl(restOptions.query) : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url

    const response = await fetch(fullUrl, {
      ...(await this._getOptions(restOptions, "DELETE", restOptions.withoutToken, restOptions.optionalToken)),
      ...(next && { next }),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  public static async postData<T>(
    url: string,
    formData: FormData,
    options: HttpOptions & Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    "use server"
    const { next, ...restOptions } = options
    const queryString = restOptions.query ? toQueryUrl(restOptions.query) : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url

    const response = await fetch(fullUrl, {
      ...(await this._getFileUploadOptions({ ...restOptions, body: formData }, "POST")),
      ...(next && { next }),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  private static async _getApiToken(optionalToken?: boolean): Promise<string | undefined> {
    const session = await auth()

    if ((!session || !session.apiToken) && !optionalToken) {
      throw new HttpError("User not authenticated", 401)
    }

    return session?.apiToken
  }

  private static async _handleError(response: Response) {
    try {
      const data = (await response.json()) as {
        message?: string | string[]
        error?: string | boolean
        errorMessage?: string
        code?: number
        errors?: unknown
        details?: unknown
      }

      // Extract error message - prioritize 'message' field, then 'errorMessage'
      // If 'error' is a boolean, don't use it as the message
      let errorMessage = Array.isArray(data?.message)
        ? data.message.filter(Boolean).join(". ")
        : data?.message || data?.errorMessage

      if (!errorMessage && typeof data?.error === "string") {
        errorMessage = data.error
      }

      const extraErrors = data.errors
      if (Array.isArray(extraErrors) && extraErrors.length > 0) {
        const details = extraErrors
          .map((item) => {
            if (typeof item === "string") return item
            if (item && typeof item === "object") {
              const record = item as { message?: unknown; field?: unknown }
              if (typeof record.message === "string") {
                return record.field ? `${record.field}: ${record.message}` : record.message
              }
            }
            return ""
          })
          .filter(Boolean)
          .join(". ")
        if (details) errorMessage = errorMessage ? `${errorMessage}: ${details}` : details
      }

      // Final fallback
      if (!errorMessage) {
        errorMessage = response.statusText || "Something went wrong"
      }

      throw new HttpError(errorMessage, response.status || 500, data.details)
    } catch (parseError) {
      // If the error is already an HttpError (from our throw above), re-throw it
      if (parseError instanceof HttpError) {
        throw parseError
      }

      // Only handle actual JSON parsing errors
      const fallbackMessage = response.statusText || "Something went wrong"
      throw new HttpError(fallbackMessage, response.status || 500)
    }
  }

  private static async _getOptions(
    options: Omit<RequestInit, "method"> = {},
    method: string,
    withoutToken?: boolean,
    optionalToken?: boolean
  ): Promise<RequestInit> {
    const { headers, ...restOptions } = options
    let header = {
      "Content-Type": "application/json",
      ...headers,
    }

    if (!withoutToken) {
      const token = await this._getApiToken(optionalToken)

      if (token) {
        ;(header as any).Authorization = `Bearer ${token}`
      }
    }

    return {
      method,
      headers: header,
      ...restOptions,
    }
  }

  private static async _getFileUploadOptions(
    options: Omit<RequestInit, "method"> = {},
    method: string
  ): Promise<RequestInit> {
    const { headers, ...restOptions } = options
    const token = await this._getApiToken()

    return {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      ...restOptions,
    }
  }
}
