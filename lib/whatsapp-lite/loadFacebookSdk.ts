const FACEBOOK_SDK_SCRIPT_ID = "facebook-jssdk"
const FACEBOOK_SDK_SRC = "https://connect.facebook.net/en_US/sdk.js"

type FacebookLoginResponse = {
  authResponse?: { code?: string } | null
  status?: string
}

type FacebookSdk = {
  init: (params: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>
  ) => void
}

declare global {
  interface Window {
    FB?: FacebookSdk
    fbAsyncInit?: () => void
  }
}

export function loadFacebookSdk(params: { appId: string; version: string }): Promise<FacebookSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook SDK is browser-only"))
  }
  if (window.FB) return Promise.resolve(window.FB)

  return new Promise((resolve, reject) => {
    const previous = window.fbAsyncInit
    window.fbAsyncInit = function fbAsyncInit() {
      try {
        previous?.()
        window.FB?.init({
          appId: params.appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: params.version,
        })
        if (!window.FB) {
          reject(new Error("Facebook SDK failed to initialize"))
          return
        }
        resolve(window.FB)
      } catch (err) {
        reject(err)
      }
    }

    if (document.getElementById(FACEBOOK_SDK_SCRIPT_ID)) return

    const script = document.createElement("script")
    script.id = FACEBOOK_SDK_SCRIPT_ID
    script.async = true
    script.defer = true
    script.crossOrigin = "anonymous"
    script.src = FACEBOOK_SDK_SRC
    script.onerror = () => reject(new Error("Failed to load Facebook SDK"))
    const first = document.getElementsByTagName("script")[0]
    first?.parentNode?.insertBefore(script, first)
    if (!first?.parentNode) document.head.appendChild(script)
  })
}

export function launchWhatsAppEmbeddedSignup(
  fb: FacebookSdk,
  params: { configId: string; extras: Record<string, unknown> }
): Promise<string> {
  return new Promise((resolve, reject) => {
    fb.login(
      (response) => {
        const code = response.authResponse?.code?.trim()
        if (!code) {
          reject(new Error("Facebook login did not return an Embedded Signup code"))
          return
        }
        resolve(code)
      },
      {
        config_id: params.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: params.extras,
      }
    )
  })
}
