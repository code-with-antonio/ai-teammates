import { auth } from "@clerk/nextjs/server"
import { asc, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { chatMembers, chats } from "@/db/schema"

// The signed-in user's chats, most recent first, each with the bot that fronts it
export async function getChats() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const rows = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: desc(chats.lastMessageAt),
    with: {
      // Group chats fall back to their first bot for now
      members: {
        orderBy: asc(chatMembers.joinedAt),
        limit: 1,
        with: { bot: true },
      },
    },
  })

  // A chat whose bots were all deleted has nobody to show
  return rows.flatMap(({ members, ...chat }) =>
    members[0] ? [{ ...chat, bot: members[0].bot }] : []
  )
}

export type ChatWithBot = Awaited<ReturnType<typeof getChats>>[number]
