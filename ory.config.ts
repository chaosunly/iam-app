import type { OryClientConfiguration } from "@ory/elements-react";

const config: OryClientConfiguration = {
  sdk: {
    // Always use the public app URL - middleware will proxy to Kratos
    // This ensures all generated URLs (including footer links) point to the app domain
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
  project: {
    default_redirect_url: "/dashboard",
    error_ui_url: "/error",
    name: "Ory Next.js App Router Example",
    registration_enabled: true,
    verification_enabled: true,
    recovery_enabled: true,
    registration_ui_url: "/auth/registration",
    verification_ui_url: "/auth/verification",
    recovery_ui_url: "/auth/recovery",
    login_ui_url: "/auth/login",
    settings_ui_url: "/auth/settings",
    default_locale: "en",
    locale_behavior: "respect_accept_language",
  },
};

export default config;
