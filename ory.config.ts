import type { OryClientConfiguration } from "@ory/elements-react"

const config: OryClientConfiguration = {
  sdk: {
    // Client uses Next.js app (for proxying), server uses actual Ory URL
    url: typeof window !== 'undefined' 
      ? (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001')
      : (process.env.ORY_SDK_URL || 'https://gateway-production-c2b4.up.railway.app'),
  },
  project: {
    default_redirect_url: "/",
    error_ui_url: "/error",
    name: "Ory Next.js App Router Example",
    registration_enabled: true,
    verification_enabled: true,
    recovery_enabled: true,
    registration_ui_url: "/auth/registration",
    verification_ui_url: "/auth/verification",
    recovery_ui_url: "/auth/recovery",
    login_ui_url: "/auth/login",
    settings_ui_url: "/settings",
    default_locale: "en",
    locale_behavior: "respect_accept_language",
  },
}

export default config


