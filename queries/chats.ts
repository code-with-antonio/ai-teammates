import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { chatMembers, chats } from "@/db/schema"

// One of the signed-in user's chats with the bot that fronts it, or null if it isn't theirs
export async function getChat(chatId: string) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const row = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      // Group chats fall back to their first bot for now
      members: {
        orderBy: asc(chatMembers.joinedAt),
        limit: 1,
        with: { bot: true },
      },
    },
  })
  if (!row) return null

  // A chat whose bots were all deleted has nobody to show
  const { members, ...chat } = row
  return members[0] ? { ...chat, bot: members[0].bot } : null
}
