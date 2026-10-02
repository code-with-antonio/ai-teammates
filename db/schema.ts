import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { nanoid } from "nanoid"
import type { z } from "zod"

export const bots = pgTable(
  "bots",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => nanoid()),
    // Clerk user ID
    userId: text().notNull(),
    name: text().notNull(),
    // Seed for the bot's face
    avatar: text()
      .notNull()
      .$defaultFn(() => nanoid()),
    // What the bot is for, in a phrase
    job: text().notNull(),
    // How it should go about the job
    instructions: text(),
    // Sandbox provider ID, created lazily
    sandboxId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)]
)

// What a user may submit; userId comes from the session, the rest is generated
export const botInsertSchema = createInsertSchema(bots, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Give your bot a name.")
      .max(50, "Keep it under 50 characters."),
  job: (schema) =>
    schema
      .trim()
      .min(1, "Tell your bot what its job is.")
      .max(100, "Keep it under 100 characters."),
  instructions: (schema) =>
    schema.trim().max(4000, "Keep it under 4000 characters."),
}).omit({ id: true, userId: true, sandboxId: true, createdAt: true })

export type Bot = typeof bots.$inferSelect
export type NewBot = typeof bots.$inferInsert
export type BotInsert = z.infer<typeof botInsertSchema>
