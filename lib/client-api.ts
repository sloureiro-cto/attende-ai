export class HttpError extends Error {
  public status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status

    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

export class FetchClient {
  public static async get<T>(
    url: string,
    options: { query?: any; withoutToken?: boolean } & Omit<RequestInit, "method"> = {}
  ): Promise<T> {
    const queryString = options.query ? new URLSearchParams(options.query).toString() : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url
    const response = await fetch(fullUrl, {
      ...(await this._getOptions(options, "GET", options.withoutToken)),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  public static async post<T, B = undefined>(
    url: string,
    body: B | any,
    options: { query?: any; withoutToken?: boolean } & Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    const queryString = options.query ? new URLSearchParams(options.query).toString() : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url

    const response = await fetch(fullUrl, {
      ...(await this._getOptions({ ...options, body: JSON.stringify(body) }, "POST", options.withoutToken)),
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
    options: { query?: any; withoutToken?: boolean } & Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    const queryString = options.query ? new URLSearchParams(options.query).toString() : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url

    const response = await fetch(fullUrl, {
      ...(await this._getOptions({ ...options, body: JSON.stringify(body) }, "PUT", options.withoutToken)),
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
    options: { query?: any; withoutToken?: boolean } & Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    const queryString = options.query ? new URLSearchParams(options.query).toString() : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url

    const response = await fetch(fullUrl, {
      ...(await this._getOptions({ ...options, body: JSON.stringify(body) }, "PATCH", options.withoutToken)),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  public static async delete<T>(
    url: string,
    options: { query?: any; withoutToken?: boolean } & Omit<RequestInit, "method"> = {}
  ): Promise<T> {
    const queryString = options.query ? new URLSearchParams(options.query).toString() : ""
    const fullUrl = queryString ? `${url}?${queryString}` : url

    const response = await fetch(fullUrl, {
      ...(await this._getOptions(options, "DELETE", options.withoutToken)),
    })

    if (!response.ok) {
      await this._handleError(response)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  }

  private static async _handleError(response: Response) {
    const errorMessage = await response.json().then((data: any) => data?.message)

    throw new HttpError(errorMessage || "Something went wrong", response.status || 500)
  }

  private static async _getOptions(
    options: Omit<RequestInit, "method"> = {},
    method: string,
    withoutToken?: boolean
  ): Promise<RequestInit> {
    const { headers, ...restOptions } = options
    let header = {
      "Content-Type": "application/json",
      ...headers,
    }

    if (!withoutToken) {
      try {
        // Get token from session endpoint
        const response = await fetch("/api/auth/clientsession", {
          method: "GET",
          credentials: "include",
        })

        if (response.ok) {
          const session = (await response.json()) as { apiToken?: string }
          if (session?.apiToken) {
            ;(header as any).Authorization = `Bearer ${session.apiToken}`
          }
        }
      } catch (error) {
        console.error("Failed to get session token:", error)
      }
    }

    return {
      method,
      headers: header,
      ...restOptions,
    }
  }
}
