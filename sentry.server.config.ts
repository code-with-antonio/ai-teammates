import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Attach local variable values to stack frames
  includeLocalVariables: true,

  // Logs need no switch in SDK 11: Sentry.logger always sends. This adds
  // whatever is written to console.warn and console.error, outside
  // development, where that is mostly dev-server notices.
  integrations:
    process.env.NODE_ENV === "production"
      ? [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })]
      : [],
})
