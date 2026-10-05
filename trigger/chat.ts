import { anthropic } from "@ai-sdk/anthropic"
import { chat } from "@trigger.dev/sdk/ai"

// The transcript is kept per chatId by the agent's default transcript storage
export const chatAgent = chat.agent({
  id: "chat",
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: anthropic("claude-opus-5-5"),
      messages,
      abortSignal: signal,
    }),
})
