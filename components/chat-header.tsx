"use client"

import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { useDesktopPanel } from "@/components/desktop-panel"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { Button } from "@/components/ui/button"
import type { ChatWithBots } from "@/queries/bots"

// Only rendered in direct chats, the only ones inside a DesktopPanelProvider
function DesktopButton() {
  const desktopPanel = useDesktopPanel()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="ml-auto"
      aria-label="Desktop"
      aria-pressed={desktopPanel.open}
      onClick={desktopPanel.toggle}
    >
      <MonitorIcon />
    </Button>
  )
}

function ChatHeader({ chat }: { chat: ChatWithBots }) {
  return (
    <header
      data-slot="chat-header"
      className="flex h-12 shrink-0 items-center gap-2 border-b px-4"
    >
      {chat.kind === "group" ? (
        <h1 className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <GroupChatAvatar
            seeds={chat.bots.map((bot) => bot.avatar)}
            className="size-6"
          />
          <span className="truncate">{chat.name}</span>
        </h1>
      ) : (
        <>
          <h1 className="-ml-2 flex min-w-0">
            <BotDialog
              bot={chat.bots[0]}
              trigger={
                <Button variant="ghost" className="min-w-0 shrink gap-2 px-2" />
              }
            >
              <ChatAvatar seed={chat.bots[0].avatar} className="size-6" />
              <span className="truncate">{chat.name ?? chat.bots[0].name}</span>
            </BotDialog>
          </h1>
          <DesktopButton />
        </>
      )}
    </header>
  )
}

export { ChatHeader }
