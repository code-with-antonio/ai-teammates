import * as Sentry from "@sentry/node"
import { tasks } from "@trigger.dev/sdk"

// Loaded by Trigger.dev before any task runs. Errors only: Trigger.dev traces
// the runs itself, and Sentry's default integrations would fight it for
// OpenTelemetry.
Sentry.init({
  defaultIntegrations: false,
  // The same project the Next.js app reports to (sentry.server.config.ts)
  dsn: "https://56bde339330e16c3056087197c52b213@o4511411455262720.ingest.us.sentry.io/4512220422012928",
  environment:
    process.env.NODE_ENV === "production" ? "production" : "development",
})

// Fires once a run has used up its retries. The payload is left out, as a
// chat's payload is the person's messages.
tasks.onFailure(async ({ error, ctx }) => {
  Sentry.captureException(error, {
    tags: {
      "trigger.task": ctx.task.id,
      "trigger.run": ctx.run.id,
    },
    extra: { ctx },
  })

  // The process can be frozen or gone as soon as the run ends
  await Sentry.flush(2000)
})
