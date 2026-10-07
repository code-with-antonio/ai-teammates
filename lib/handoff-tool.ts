import { tool } from "ai"
import { z } from "zod"

// Who took over, for the model and for the chat to show
export type Handoff = { botId: string; name: string }

// Lets a bot in a group chat pass the turn to a teammate. `handoff` makes the
// switch, and throws when the teammate can't take it.
export function createHandoffTool(
  handoff: (botId: string) => Handoff | Promise<Handoff>
) {
  return {
    handoff: tool({
      description:
        "Hand the person's request to another teammate in this group chat, when it belongs to their job rather than yours. They take over and answer in your place, so call this instead of answering.",
      inputSchema: z.object({
        botId: z
          .string()
          .describe(
            "The id of the teammate to hand off to, from the list of teammates in this chat"
          ),
        note: z
          .string()
          .describe("What the teammate should do, in a sentence or two"),
      }),
      execute: async ({ botId }) => handoff(botId),
    }),
  }
}

export type HandoffTools = ReturnType<typeof createHandoffTool>
