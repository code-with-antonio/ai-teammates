import { neon } from "@neon/ai-sdk-provider"
import type { LanguageModelUsage } from "ai"

type Model = ReturnType<typeof neon>
type CallOptions = Parameters<Model["doStream"]>[0]

// AI SDK 7 hands every file in a tool result to this older provider as a
// document upload, which the model rejects for images. Send images as images.
function withImageToolResults(options: CallOptions): CallOptions {
  return {
    ...options,
    prompt: options.prompt.map((message) => {
      if (message.role !== "tool") return message

      return {
        ...message,
        content: message.content.map((part) => {
          if (part.type !== "tool-result" || part.output.type !== "content")
            return part

          return {
            ...part,
            output: {
              ...part.output,
              value: part.output.value.map((item) =>
                item.type === "file-data" && item.mediaType.startsWith("image/")
                  ? {
                      type: "image-data" as const,
                      data: item.data,
                      mediaType: item.mediaType,
                    }
                  : item
              ),
            },
          }
        }),
      }
    }),
  }
}

// The model the chat agent talks to
export function chatModel(): Model {
  const model = neon("gpt-5")

  return {
    specificationVersion: model.specificationVersion,
    provider: model.provider,
    modelId: model.modelId,
    supportedUrls: model.supportedUrls,
    doGenerate: (options) => model.doGenerate(withImageToolResults(options)),
    doStream: (options) => model.doStream(withImageToolResults(options)),
  }
}

// Dollars per million tokens for the model above. The gateway bills the
// provider's list price; it publishes no cheaper rate for cached input.
const pricing = { input: 1.25, output: 10 }

// What a call to the chat model cost, in millionths of a dollar
export function chatModelCost(usage: LanguageModelUsage) {
  // Dollars per million tokens is millionths of a dollar per token
  return Math.ceil(
    (usage.inputTokens ?? 0) * pricing.input +
      (usage.outputTokens ?? 0) * pricing.output
  )
}
