import * as Sentry from "@sentry/node"
import { schedules } from "@trigger.dev/sdk"
import { inArray } from "drizzle-orm"

import { db } from "@/db"
import { bots } from "@/db/schema"
import { listRunningSandboxIds, stopBotSandbox } from "@/lib/daytona"
import { getUsage, recordUsage } from "@/lib/usage"

// How often the sandboxes are looked at, and so what one sighting is billed as
const INTERVAL_MINUTES = 5

// Daytona stops idle sandboxes by itself and reports no running time, so the
// ledger is filled by looking: every sandbox found running is charged for the
// interval to its bot's owner. Owners with nothing left have theirs stopped.
export const meterSandboxes = schedules.task({
  id: "meter-sandboxes",
  cron: `*/${INTERVAL_MINUTES} * * * *`,
  maxDuration: 240,
  run: async ({ timestamp }) => {
    const running = await listRunningSandboxIds()
    if (running.length === 0) return

    const owned = await db
      .select({ sandboxId: bots.sandboxId, userId: bots.userId })
      .from(bots)
      .where(inArray(bots.sandboxId, running))

    await recordUsage(
      owned.map(({ sandboxId, userId }) => ({
        userId,
        kind: "sandbox" as const,
        amount: INTERVAL_MINUTES * 60,
        // A retried run meters the same moment again
        idempotencyKey: `sandbox:${sandboxId}:${timestamp.toISOString()}`,
      }))
    )

    let stopped = 0
    for (const userId of new Set(owned.map((bot) => bot.userId))) {
      const usage = await getUsage(userId)
      if (usage && usage.remaining.sandbox > 0) continue

      const sandboxIds = owned
        .filter((bot) => bot.userId === userId)
        .map((bot) => bot.sandboxId)
      await Promise.all(sandboxIds.map((id) => stopBotSandbox(id)))

      stopped += sandboxIds.length
      Sentry.logger.warn("Sandboxes stopped: usage limit reached", {
        "user.id": userId,
        "sandbox.count": sandboxIds.length,
        // Null without a paid plan, which stops them just the same
        "billing.paid": !!usage,
      })
    }

    Sentry.logger.info("Sandboxes metered", {
      "sandbox.running": running.length,
      "sandbox.billed": owned.length,
      // Running at Daytona with no bot to charge: nobody pays for these
      "sandbox.unowned": running.length - owned.length,
      "sandbox.stopped": stopped,
      "usage.seconds": INTERVAL_MINUTES * 60,
    })
  },
})
