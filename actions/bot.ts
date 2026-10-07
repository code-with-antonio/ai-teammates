"use server"

import { auth } from "@clerk/nextjs/server"
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

export async function createBot(values: BotInsert) {
  const { isAuthenticated, userId, has } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")
  // A bot always comes with a sandbox, so creating one takes both
  if (!has({ feature: "bots" }) || !has({ feature: "sandboxes" })) {
    throw new Error("Upgrade required")
  }

  const data = botInsertSchema.parse(values)

  // Generated here so the sandbox can be labelled before the row exists
  const id = nanoid()
  const sandboxId = await createBotSandbox(id)

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

    return bot
  } catch (error) {
    // No bot, no sandbox; the original error is the one worth reporting
    await deleteBotSandbox(sandboxId).catch(() => {})
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
}
