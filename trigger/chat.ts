import { chat } from "@trigger.dev/sdk/ai"
import { isStepCount } from "ai"
import { asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { chatMembers, type Bot } from "@/db/schema"
import { chatModel } from "@/lib/model"
import { createSandboxTools, type ChatUIMessage } from "@/lib/sandbox-tools"

// The bot answering in this chat. No session here: the chat's owner was checked
// when the session started. Group chats fall back to their first bot for now.
async function getChatBot(chatId: string) {
  const member = await db.query.chatMembers.findFirst({
    where: eq(chatMembers.chatId, chatId),
    orderBy: asc(chatMembers.joinedAt),
    with: { bot: true },
  })
  if (!member) throw new Error("Chat has no bot")

  return member.bot
}

function buildInstructions(bot: Bot) {
  return [
    `You are ${bot.name}, an AI teammate. Your job: ${bot.job}`,
    "You work alongside the person you are talking to as a member of their team. They gave you your name and your job, and they come to you for that job. Stay in that role, and when asked who you are, answer as yourself.",
    bot.instructions &&
      `They also told you how to go about your job:\n\n${bot.instructions}`,
    "You have a sandbox of your own: an isolated Linux machine in the cloud with its own filesystem, network, CPU, memory and disk. It belongs to you alone, is not shared with other teammates, and stays yours for as long as you exist. Files you leave there are still there next time.",
    "Your tools all act on that sandbox. You can run shell commands and read, write and list files. It also has a graphical desktop, 1024x768 pixels, that you operate with the mouse and keyboard tools. Prefer the shell and file tools when they can do the job; use the desktop for things that need a screen.",
    "On the desktop you work blind until you look: call viewScreen to see it before you click or type, and again afterwards to check what happened. viewScreen is for your own eyes. Call showScreen instead only when the person asks to see the screen or asks what is on it, because that one puts the screenshot in the chat.",
    "Do the work rather than describing how it could be done, and say plainly when something failed.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

// The transcript is kept per chatId by the agent's default transcript storage
export const chatAgent = chat.withUIMessage<ChatUIMessage>().agent({
  id: "chat",
  // Declared here so screenshots stay images when earlier turns are replayed
  tools: ({ chatId }) =>
    createSandboxTools(async () => (await getChatBot(chatId)).sandboxId),
  run: async ({ chatId, messages, tools, signal, streamText }) => {
    // Read every turn, so edits to the bot apply to the next message
    const bot = await getChatBot(chatId)

    return streamText({
      model: chatModel(),
      // The managed streamText takes the prompt as `system` on every AI SDK version
      system: buildInstructions(bot),
      messages,
      tools,
      // Desktop work is one small action per step
      stopWhen: isStepCount(50),
      abortSignal: signal,
    })
  },
})
