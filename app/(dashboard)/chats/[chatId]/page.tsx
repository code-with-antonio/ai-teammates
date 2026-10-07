import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
import { DesktopPanel, DesktopPanelProvider } from "@/components/desktop-panel"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { getBots } from "@/queries/bots"
import { getChat } from "@/queries/chats"

export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  await auth.protect()

  const { chatId } = await params
  const chat = await getChat(chatId)
  if (!chat) notFound()

  // A group has several bots and so no single desktop to show
  if (chat.kind === "group") {
    const bots = await getBots()

    return (
      <div className="flex h-svh flex-col">
        <ChatHeader
          chat={chat}
          bots={bots.map(({ id, name, avatar }) => ({ id, name, avatar }))}
        />
        <Chat
          chatId={chat.id}
          bots={chat.bots.map(({ id, name, avatar }) => ({ id, name, avatar }))}
        />
      </div>
    )
  }

  return (
    <DesktopPanelProvider key={chat.id} chatId={chat.id}>
      {/* The group sizes itself to its parent, so the viewport height goes here */}
      <div className="h-svh">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel id="chat" minSize="30%">
            <div className="flex h-full flex-col">
              <ChatHeader chat={chat} />
              <Chat chatId={chat.id} />
            </div>
          </ResizablePanel>
          <DesktopPanel name={chat.bots[0].name} />
        </ResizablePanelGroup>
      </div>
    </DesktopPanelProvider>
  )
}
