import { neon } from "@neon/ai-sdk-provider"
import { chat } from "@trigger.dev/sdk/ai"

// The transcript is kept per chatId by the agent's default transcript storage
export const chatAgent = chat.agent({
  id: "chat",
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: neon("claude-sonnet-5"),
      messages,
      abortSignal: signal,
    }),
})
