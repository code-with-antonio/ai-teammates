"use server"

import { auth } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"
import { and, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import {
  botInsertSchema,
  bots,
  chatMembers,
  chats,
  type BotInsert,
} from "@/db/schema"
import { createBotSandbox, deleteBotSandbox } from "@/lib/daytona"
import { getUsage } from "@/lib/usage"

export async function createBot(values: BotInsert) {
  const { isAuthenticated, userId, has } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")
  // A bot always comes with a sandbox, so creating one takes both
  if (!has({ feature: "bots" }) || !has({ feature: "sandboxes" })) {
    Sentry.logger.warn("Bot creation blocked: upgrade required", {
      "user.id": userId,
    })
    throw new Error("Upgrade required")
  }
  // The new sandbox starts running right away
  const usage = await getUsage(userId)
  if (!usage || usage.remaining.sandbox <= 0) {
    Sentry.logger.warn("Bot creation blocked: usage limit reached", {
      "user.id": userId,
      "usage.kind": "sandbox",
    })
    throw new Error("Usage limit reached")
  }

  const data = botInsertSchema.parse(values)

  // Generated here so the sandbox can be labelled before the row exists
  const id = nanoid()
  const startedAt = Date.now()
  const sandboxId = await createBotSandbox(id)
  const sandboxMs = Date.now() - startedAt

  try {
    // A new bot always comes with its direct chat; all three rows or none
    const bot = await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values({
          ...data,
          id,
          instructions: data.instructions || null,
          userId,
          sandboxId,
        })
        .returning()

      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning({ id: chats.id })

      await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

      return bot
    })

    revalidatePath("/")

    Sentry.logger.info("Bot created", {
      "user.id": userId,
      "bot.id": bot.id,
      "sandbox.id": sandboxId,
      "sandbox.create_ms": sandboxMs,
    })

    return bot
  } catch (error) {
    // No bot, no sandbox; the original error is the one worth reporting
    const cleaned = await deleteBotSandbox(sandboxId).then(
      () => true,
      () => false
    )
    // A sandbox left behind runs, and bills, with no bot to find it by
    Sentry.logger[cleaned ? "warn" : "error"](
      cleaned
        ? "Bot creation failed: sandbox removed"
        : "Bot creation failed: sandbox left behind",
      { "user.id": userId, "bot.id": id, "sandbox.id": sandboxId }
    )
    throw error
  }
}

export async function updateBot(botId: string, values: BotInsert) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const data = botInsertSchema.parse(values)

  const [bot] = await db
    .update(bots)
    .set({ ...data, instructions: data.instructions || null })
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning()
  if (!bot) throw new Error("Bot not found")

  // The bot shows up in the sidebar and in every chat it fronts
  revalidatePath("/", "layout")

  Sentry.logger.info("Bot updated", { "user.id": userId, "bot.id": bot.id })

  return bot
}

export async function deleteBot(botId: string) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const [owned] = await db
    .select({ sandboxId: bots.sandboxId })
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
  if (!owned) throw new Error("Bot not found")

  // Sandbox first: if this fails the bot stays and the delete can be retried
  await deleteBotSandbox(owned.sandboxId)

  await db.transaction(async (tx) => {
    // A direct chat is nothing without its bot; memberships go with the bot
    await tx
      .delete(chats)
      .where(
        and(
          eq(chats.userId, userId),
          eq(chats.kind, "direct"),
          inArray(
            chats.id,
            tx
              .select({ id: chatMembers.chatId })
              .from(chatMembers)
              .where(eq(chatMembers.botId, botId))
          )
        )
      )

    const [bot] = await tx
      .delete(bots)
      .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
      .returning({ id: bots.id })
    if (!bot) throw new Error("Bot not found")
  })

  revalidatePath("/", "layout")

  Sentry.logger.info("Bot deleted", {
    "user.id": userId,
    "bot.id": botId,
    "sandbox.id": owned.sandboxId,
  })
}
