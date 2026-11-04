import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { MessageCircleIcon, PlusIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { getBots, getChats } from "@/queries/bots"

export default async function BotsPage() {
  await auth.protect()

  const [bots, chats] = await Promise.all([getBots(), getChats()])

  // Each bot has one direct chat; group chats must not stand in for it
  const botChatMap = new Map<string, string>(
    chats.flatMap((chat) =>
      chat.kind === "direct" ? [[chat.bots[0].id, chat.id] as const] : []
    )
  )

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Bots</h1>
        <BotDialog>
          <PlusIcon data-icon="inline-start" />
          Create a new bot
        </BotDialog>
      </div>
      {bots.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No bots yet</EmptyTitle>
            <EmptyDescription>
              Create a bot to start a conversation.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <BotDialog>
              <PlusIcon data-icon="inline-start" />
              Create a new bot
            </BotDialog>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bots.map((bot) => {
            const chatId = botChatMap.get(bot.id)
            return (
              <div
                key={bot.id}
                className="flex flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex items-center gap-3">
                  <ChatAvatar seed={bot.avatar} className="size-10" />
                  <div className="grid min-w-0 leading-tight">
                    <span className="truncate font-medium">{bot.name}</span>
                    <span className="truncate text-sm text-muted-foreground">
                      {bot.job}
                    </span>
                  </div>
                </div>
                {chatId && (
                  <Link
                    href={`/chats/${chatId}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <MessageCircleIcon data-icon="inline-start" />
                    Open chat
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
