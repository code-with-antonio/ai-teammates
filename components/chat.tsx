"use client"

import { useChat } from "@ai-sdk/react"
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import { isToolUIPart } from "ai"
import { useState } from "react"

import {
  loadTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"

import { ChatAvatar } from "@/components/chat-avatar"
import { CodeBlock } from "@/components/ai-elements/code-block"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Image } from "@/components/ai-elements/image"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import type { Bot } from "@/db/schema"
import type { ChatUIMessage } from "@/lib/sandbox-tools"
import type { chatAgent } from "@/trigger/chat"

type ChatBot = Pick<Bot, "id" | "name" | "avatar">

type ToolPart = Extract<
  ChatUIMessage["parts"][number],
  { type: `tool-${string}` }
>

const toolTitles: Record<ToolPart["type"], string> = {
  "tool-bash": "Run command",
  "tool-readFile": "Read file",
  "tool-writeFile": "Write file",
  "tool-listFiles": "List files",
  "tool-mouseClick": "Click",
  "tool-mouseMove": "Move mouse",
  "tool-mouseDrag": "Drag",
  "tool-mouseScroll": "Scroll",
  "tool-keyboardType": "Type",
  "tool-keyboardPress": "Press key",
  "tool-viewScreen": "Look at screen",
  "tool-showScreen": "Show screen",
  "tool-handoff": "Hand off",
}

function ToolCall({ part }: { part: ToolPart }) {
  // The one tool whose result is for the reader: show it, not the call
  if (part.type === "tool-showScreen" && part.state === "output-available") {
    return (
      <Image
        alt="The sandbox's screen"
        base64={part.output.base64}
        className="border"
        mediaType={part.output.mediaType}
      />
    )
  }

  // The teammate's reply follows right below, so one line is enough
  if (part.type === "tool-handoff" && part.state === "output-available") {
    return (
      <p className="text-muted-foreground">Handed off to {part.output.name}</p>
    )
  }

  return (
    <Tool>
      <ToolHeader
        state={part.state}
        title={toolTitles[part.type]}
        type={part.type}
      />
      <ToolContent>
        <ToolCallDetails part={part} />
      </ToolContent>
    </Tool>
  )
}

function ToolCallDetails({ part }: { part: ToolPart }) {
  const error = part.state === "output-error" ? part.errorText : undefined

  // Screenshots are for the bot's eyes and stay out of the chat
  if (part.type === "tool-viewScreen" || part.type === "tool-showScreen") {
    return (
      <ToolOutput
        errorText={error}
        output={
          part.state === "output-available" ? (
            <p className="p-3 text-muted-foreground">
              {part.type === "tool-viewScreen"
                ? "Took a screenshot for its own use."
                : "Took a screenshot."}
            </p>
          ) : undefined
        }
      />
    )
  }

  if (part.type === "tool-bash") {
    return (
      <>
        {part.input?.command ? (
          <CodeBlock code={part.input.command} language="bash" />
        ) : null}
        <ToolOutput
          errorText={error}
          output={
            part.state === "output-available" ? (
              <CodeBlock
                code={part.output.output || `Exit code ${part.output.exitCode}`}
                language="log"
              />
            ) : undefined
          }
        />
      </>
    )
  }

  return (
    <>
      {part.input === undefined ? null : <ToolInput input={part.input} />}
      <ToolOutput
        errorText={error}
        output={part.state === "output-available" ? part.output : undefined}
      />
    </>
  )
}

// A reply is one message even when a handoff changes who is writing it, so it
// is cut at each handoff and every stretch gets its own author. Only a group
// chat passes bots, so only its replies get a face.
function splitByAuthor(message: ChatUIMessage, bots: ChatBot[]) {
  const findBot = (botId?: string) => bots.find((bot) => bot.id === botId)

  let section = {
    author:
      message.role === "assistant"
        ? findBot(message.metadata?.botId)
        : undefined,
    parts: [] as ChatUIMessage["parts"],
  }
  const sections = [section]

  for (const part of message.parts) {
    section.parts.push(part)

    if (part.type === "tool-handoff" && part.state === "output-available") {
      section = { author: findBot(part.output.botId), parts: [] }
      sections.push(section)
    }
  }

  return sections
}

// `bots` are a group chat's members to pick from; a direct chat passes none
function Chat({ chatId, bots }: { chatId: string; bots?: ChatBot[] }) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
  })
  const { messages, isLoading } = useLoadTranscript(chatId, loadTranscript, {
    transport,
  })

  // useChat only reads its initial messages on mount, so wait for the transcript
  if (isLoading) return null

  return (
    <ChatMessages
      key={chatId}
      chatId={chatId}
      bots={bots}
      initialMessages={messages}
      transport={transport}
    />
  )
}

function ChatMessages({
  chatId,
  bots = [],
  initialMessages,
  transport,
}: {
  chatId: string
  bots?: ChatBot[]
  initialMessages: ChatUIMessage[]
  transport: TriggerChatTransport
}) {
  const { messages, sendMessage, status, stop } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
  })
  // The bot the next message goes to, in a group chat
  const [botId, setBotId] = useState(bots[0]?.id)
  const selectedBot = bots.find((bot) => bot.id === botId)

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text.trim()) return
    // The agent reads this turn's metadata to decide which bot answers
    sendMessage(
      { text: message.text },
      selectedBot ? { metadata: { botId: selectedBot.id } } : undefined
    )
  }

  return (
    <div data-slot="chat" className="flex min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.flatMap((message) =>
            splitByAuthor(message, bots).map(({ author, parts }, i) => (
              <Message
                from={message.role}
                key={`${message.id}-${i}`}
                className={author && "flex-row items-start"}
              >
                {author && (
                  <ChatAvatar seed={author.avatar} className="size-6" />
                )}
                <MessageContent>
                  {parts.map((part, j) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={`${message.id}-${i}-${j}`}>
                          {part.text}
                        </MessageResponse>
                      )
                    }
                    if (part.type !== "dynamic-tool" && isToolUIPart(part)) {
                      return <ToolCall key={part.toolCallId} part={part} />
                    }
                    return null
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea placeholder="Send a message..." />
          <PromptInputFooter
            className={selectedBot ? undefined : "justify-end"}
          >
            {selectedBot && (
              <PromptInputTools>
                <PromptInputSelect
                  value={selectedBot.id}
                  onValueChange={(value) => setBotId(value as string)}
                >
                  <PromptInputSelectTrigger aria-label="Bot to talk to">
                    <PromptInputSelectValue>
                      <ChatAvatar
                        seed={selectedBot.avatar}
                        className="size-5"
                      />
                      {selectedBot.name}
                    </PromptInputSelectValue>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {bots.map((bot) => (
                      <PromptInputSelectItem key={bot.id} value={bot.id}>
                        <ChatAvatar seed={bot.avatar} className="size-5" />
                        {bot.name}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
            )}
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}

export { Chat }
