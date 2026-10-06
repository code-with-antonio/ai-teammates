"use server"

import { auth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"

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

export async function startChatSession(
  params: ChatStartSessionParams<typeof chatAgent>
) {
  await assertChatOwner(params.chatId)

  return startSession(params)
}

export async function mintChatAccessToken(chatId: string) {
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
  const chat = await getChat(chatId)
  if (!chat) throw new Error("Chat not found")

  return getBotDesktopUrl(chat.bot.sandboxId)
}
