"use client"

import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { useDesktopPanel } from "@/components/desktop-panel"
import { Button } from "@/components/ui/button"
import type { ChatWithBot } from "@/queries/bots"

function ChatHeader({ chat }: { chat: ChatWithBot }) {
  const desktopPanel = useDesktopPanel()

  return (
    <header
      data-slot="chat-header"
      className="flex h-12 shrink-0 items-center gap-2 border-b px-4"
    >
      <h1 className="-ml-2 flex min-w-0">
        <BotDialog
          bot={chat.bot}
          trigger={
            <Button variant="ghost" className="min-w-0 shrink gap-2 px-2" />
          }
        >
          <ChatAvatar seed={chat.bot.avatar} className="size-6" />
          <span className="truncate">{chat.name ?? chat.bot.name}</span>
        </BotDialog>
      </h1>
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
    </header>
  )
}

export { ChatHeader }
