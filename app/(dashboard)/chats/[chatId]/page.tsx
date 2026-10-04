import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
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

  return (
    <div className="flex h-svh flex-col">
      <ChatHeader chat={chat} />
      <Chat chatId={chat.id} />
    </div>
  )
}
