// Config type matching what @ory/nextjs getXxxFlow helpers require.
// project and all UI URL fields must be required strings.
const config = {
  sdk: {
    // Always use the public app URL - middleware will proxy to Kratos
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
    settings_ui_url: "/dashboard/settings",
    default_locale: "en",
    locale_behavior: "respect_accept_language" as const,
  },
} as const;

export default config;
