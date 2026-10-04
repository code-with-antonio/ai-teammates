import { auth } from "@clerk/nextjs/server"
import { neon } from "@neon/ai-sdk-provider"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

export async function POST(req: Request) {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new Response("Unauthorized", { status: 401 })

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: neon("claude-sonnet-5"),
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
