"use server"

import { auth as clerkAuth } from "@clerk/nextjs/server"
import { auth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"
import { and, eq, inArray, notInArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import {
  bots,
  chatMembers,
  chats,
  groupChatInsertSchema,
  type GroupChatInsert,
} from "@/db/schema"
import type { Feature } from "@/lib/billing"
import { getBotDesktopUrl } from "@/lib/daytona"
import type { ChatUIMessage } from "@/lib/sandbox-tools"
import { getChat } from "@/queries/chats"
import type { chatAgent } from "@/trigger/chat"

const startSession = chat.createStartSessionAction<typeof chatAgent>("chat")
const loadStoredTranscript = chat.createLoadTranscriptAction(defaultStorage)

// chatId comes from the browser; only the chat's owner may touch its session
async function assertChatOwner(chatId: string) {
  const chat = await getChat(chatId)
  if (!chat) throw new Error("Chat not found")
}

// Billable actions are for plans that include the feature
async function assertFeature(feature: Feature) {
  const { has } = await clerkAuth()
  if (!has({ feature })) throw new Error("Upgrade required")
}

export async function startChatSession(
  params: ChatStartSessionParams<typeof chatAgent>
) {
  await assertFeature("bots")
  await assertChatOwner(params.chatId)

  return startSession(params)
}

export async function mintChatAccessToken(chatId: string) {
  // Sending needs a token, so a session started on a paid plan ends with it
  await assertFeature("bots")
  await assertChatOwner(chatId)

  return auth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}

export async function loadTranscript(params: { chatId: string }) {
  await assertChatOwner(params.chatId)

  const transcript = await loadStoredTranscript(params)

  // Stored untyped, but only this agent ever writes it
  return { ...transcript, messages: transcript.messages as ChatUIMessage[] }
}

export async function getDesktopUrl(chatId: string) {
  await assertFeature("sandboxes")

  const chat = await getChat(chatId)
  // Only a direct chat has one desktop to show
  if (!chat || chat.kind !== "direct") throw new Error("Chat not found")

  return getBotDesktopUrl(chat.bots[0].sandboxId)
}

export async function createGroupChat(values: GroupChatInsert) {
  const { isAuthenticated, userId } = await clerkAuth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const data = groupChatInsertSchema.parse(values)
  const botIds = [...new Set(data.botIds)]

  // The IDs come from the browser; every one must be a bot of this user
  const owned = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, botIds)))
  if (botIds.length < 2 || owned.length !== botIds.length) {
    throw new Error("Bot not found")
  }

  const chat = await db.transaction(async (tx) => {
    const [chat] = await tx
      .insert(chats)
      .values({ userId, kind: "group", name: data.name })
      .returning()

    await tx
      .insert(chatMembers)
      .values(botIds.map((botId) => ({ chatId: chat.id, botId })))

    return chat
  })

  revalidatePath("/", "layout")

  return chat
}

export async function updateGroupChat(chatId: string, values: GroupChatInsert) {
  const { isAuthenticated, userId } = await clerkAuth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const data = groupChatInsertSchema.parse(values)
  const botIds = [...new Set(data.botIds)]

  // The IDs come from the browser; every one must be a bot of this user
  const owned = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, botIds)))
  if (botIds.length < 2 || owned.length !== botIds.length) {
    throw new Error("Bot not found")
  }

  const chat = await db.transaction(async (tx) => {
    const [chat] = await tx
      .update(chats)
      .set({ name: data.name })
      .where(
        and(
          eq(chats.id, chatId),
          eq(chats.userId, userId),
          eq(chats.kind, "group")
        )
      )
      .returning()
    if (!chat) throw new Error("Chat not found")

    await tx
      .delete(chatMembers)
      .where(
        and(
          eq(chatMembers.chatId, chatId),
          notInArray(chatMembers.botId, botIds)
        )
      )

    // Bots that stay keep the row they joined with, and so their place
    await tx
      .insert(chatMembers)
      .values(botIds.map((botId) => ({ chatId, botId })))
      .onConflictDoNothing()

    return chat
  })

  revalidatePath("/", "layout")

  return chat
}

export async function deleteGroupChat(chatId: string) {
  const { isAuthenticated, userId } = await clerkAuth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  // Memberships go with the chat; the bots stay
  const [chat] = await db
    .delete(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, userId),
        eq(chats.kind, "group")
      )
    )
    .returning({ id: chats.id })
  if (!chat) throw new Error("Chat not found")

  revalidatePath("/", "layout")
}
