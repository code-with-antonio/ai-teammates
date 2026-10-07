import type { Sandbox } from "@daytona/sdk"
import { tool, type InferUITools, type UIDataTypes, type UIMessage } from "ai"
import { z } from "zod"

import { getBotSandbox } from "@/lib/daytona"
import type { HandoffTools } from "@/lib/handoff-tool"

// Enough for a model to work with, without one noisy command filling its context
const MAX_TEXT_LENGTH = 20_000

function truncate(text: string) {
  if (text.length <= MAX_TEXT_LENGTH) return text
  return `${text.slice(0, MAX_TEXT_LENGTH)}\n… truncated ${text.length - MAX_TEXT_LENGTH} more characters`
}

const point = {
  x: z.number().int().describe("Pixels from the left edge of the screen"),
  y: z.number().int().describe("Pixels from the top edge of the screen"),
}

async function takeScreenshot(sandbox: Sandbox) {
  const [shot, display] = await Promise.all([
    sandbox.computerUse.screenshot.takeCompressed({
      format: "jpeg",
      quality: 70,
      showCursor: true,
    }),
    sandbox.computerUse.display.getInfo(),
  ])
  if (!shot.screenshot) throw new Error("The screenshot came back empty")

  const screen = display.displays?.[0]
  return {
    base64: shot.screenshot,
    mediaType: "image/jpeg",
    width: screen?.width,
    height: screen?.height,
  }
}

type Screenshot = Awaited<ReturnType<typeof takeScreenshot>>

// The model gets the picture itself rather than its base64 as text
function screenshotToModelOutput({ output }: { output: Screenshot }) {
  return {
    type: "content" as const,
    value: [
      {
        type: "text" as const,
        text: `Screenshot of the ${output.width}x${output.height} screen. Coordinates are in pixels from the top left.`,
      },
      {
        type: "file" as const,
        mediaType: output.mediaType,
        data: { type: "data" as const, data: output.base64 },
      },
    ],
  }
}

// A bot's sandbox as a tool set. The sandbox is only looked up, woken and
// given a desktop when a tool first needs it. The ID is asked for on every call
// and each sandbox is kept, since a handoff changes whose sandbox this is.
export function createSandboxTools(
  getSandboxId: () => string | Promise<string>
) {
  const sandboxes = new Map<string, Promise<Sandbox>>()
  const desktops = new Map<string, Promise<Sandbox>>()

  async function getSandbox() {
    const id = await getSandboxId()

    let sandbox = sandboxes.get(id)
    if (!sandbox) {
      sandbox = getBotSandbox(id).catch((error) => {
        // Let the next tool call try again
        sandboxes.delete(id)
        throw error
      })
      sandboxes.set(id, sandbox)
    }
    return sandbox
  }

  async function getDesktop() {
    const id = await getSandboxId()

    let desktop = desktops.get(id)
    if (!desktop) {
      desktop = getSandbox()
        .then(async (sandbox) => {
          // Starting is slow even when everything is up, so ask first
          const { status } = await sandbox.computerUse.getStatus()
          if (status !== "active") await sandbox.computerUse.start()
          return sandbox
        })
        .catch((error) => {
          desktops.delete(id)
          throw error
        })
      desktops.set(id, desktop)
    }
    return desktop
  }

  return {
    bash: tool({
      description:
        "Run a shell command in your sandbox and get its output and exit code. Commands start in your home directory unless you pass cwd, and each call is a fresh shell.",
      inputSchema: z.object({
        command: z.string().describe("The shell command to run"),
        cwd: z.string().optional().describe("Directory to run the command in"),
        timeout: z
          .number()
          .int()
          .min(1)
          .max(600)
          .optional()
          .describe("Seconds to wait before giving up. Defaults to 60."),
      }),
      execute: async ({ command, cwd, timeout = 60 }) => {
        const sandbox = await getSandbox()
        const response = await sandbox.process.executeCommand(
          command,
          // No shell expands this one, and a bad directory fails confusingly
          cwd?.replace(/^~(\/|$)/, "") || undefined,
          undefined,
          timeout
        )
        return {
          exitCode: response.exitCode,
          output: truncate(response.result),
        }
      },
    }),

    readFile: tool({
      description: "Read a text file from your sandbox.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("File path, absolute or relative to your home directory"),
      }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox()
        const file = await sandbox.fs.downloadFile(path)
        return { content: truncate(file.toString("utf8")) }
      },
    }),

    writeFile: tool({
      description:
        "Write a text file in your sandbox, creating it and any missing folders, or replacing it if it exists.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("File path, absolute or relative to your home directory"),
        content: z.string().describe("The full new content of the file"),
      }),
      execute: async ({ path, content }) => {
        const sandbox = await getSandbox()
        const file = Buffer.from(content, "utf8")
        await sandbox.fs.uploadFile(file, path)
        return { path, bytes: file.byteLength }
      },
    }),

    listFiles: tool({
      description: "List the files and folders in a directory of your sandbox.",
      inputSchema: z.object({
        path: z
          .string()
          .default(".")
          .describe(
            "Directory path, absolute or relative to your home directory"
          ),
      }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox()
        const files = await sandbox.fs.listFiles(path)
        return {
          files: files.map((file) => ({
            name: file.name,
            isDir: file.isDir,
            size: file.size,
          })),
        }
      },
    }),

    mouseClick: tool({
      description:
        "Click the mouse at a point on your sandbox's desktop. Look at the screen first to find the coordinates.",
      inputSchema: z.object({
        ...point,
        button: z.enum(["left", "right", "middle"]).default("left"),
        double: z.boolean().default(false).describe("Double-click"),
      }),
      execute: async ({ x, y, button, double }) => {
        const sandbox = await getDesktop()
        await sandbox.computerUse.mouse.click(x, y, button, double)
        return { x, y }
      },
    }),

    mouseMove: tool({
      description:
        "Move the mouse cursor to a point on your sandbox's desktop without clicking.",
      inputSchema: z.object(point),
      execute: async ({ x, y }) => {
        const sandbox = await getDesktop()
        await sandbox.computerUse.mouse.move(x, y)
        return { x, y }
      },
    }),

    mouseDrag: tool({
      description:
        "Press the left mouse button at one point on your sandbox's desktop, drag to another and release.",
      inputSchema: z.object({
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      }),
      execute: async ({ startX, startY, endX, endY }) => {
        const sandbox = await getDesktop()
        await sandbox.computerUse.mouse.drag(startX, startY, endX, endY)
        return { x: endX, y: endY }
      },
    }),

    mouseScroll: tool({
      description:
        "Scroll the mouse wheel at a point on your sandbox's desktop.",
      inputSchema: z.object({
        ...point,
        direction: z.enum(["up", "down"]),
        amount: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(3)
          .describe("Wheel notches; each moves a few lines"),
      }),
      execute: async ({ x, y, direction, amount }) => {
        const sandbox = await getDesktop()
        await sandbox.computerUse.mouse.scroll(x, y, direction, amount)
        return { x, y, direction, amount }
      },
    }),

    keyboardType: tool({
      description:
        "Type text into whatever has keyboard focus on your sandbox's desktop. Newlines are typed as Enter.",
      inputSchema: z.object({
        text: z.string().describe("The text to type"),
      }),
      execute: async ({ text }) => {
        const sandbox = await getDesktop()
        await sandbox.computerUse.keyboard.type(text)
        return { typed: text.length }
      },
    }),

    keyboardPress: tool({
      description:
        "Press a single key on your sandbox's desktop, optionally with modifiers held, e.g. key 'enter', or key 'c' with modifiers ['ctrl'].",
      inputSchema: z.object({
        key: z
          .string()
          .describe(
            "A key name: a letter or digit, enter, escape, tab, backspace, delete, space, up, down, left, right, home, end, pageup, pagedown, f1-f12"
          ),
        modifiers: z.array(z.enum(["ctrl", "alt", "shift", "cmd"])).default([]),
      }),
      execute: async ({ key, modifiers }) => {
        const sandbox = await getDesktop()
        await sandbox.computerUse.keyboard.press(key, modifiers)
        return { key, modifiers }
      },
    }),

    viewScreen: tool({
      description:
        "Look at your sandbox's desktop yourself. Use this whenever you need to see the screen to do your work, such as before clicking and after an action to check what happened. The person you are talking to does not see this screenshot.",
      inputSchema: z.object({}),
      execute: async () => takeScreenshot(await getDesktop()),
      toModelOutput: screenshotToModelOutput,
    }),

    showScreen: tool({
      description:
        "Show your sandbox's desktop to the person you are talking to: the screenshot appears in the chat, and you see it too. Use this only when they ask to see the screen or what is on it.",
      inputSchema: z.object({}),
      execute: async () => takeScreenshot(await getDesktop()),
      toModelOutput: screenshotToModelOutput,
    }),
  }
}

export type SandboxTools = ReturnType<typeof createSandboxTools>
// A reply carries the bot that started it and a group chat's message the bot it
// was sent to, so the chat can show who answered whom
export type ChatMessageMetadata = { botId?: string }
export type ChatUIMessage = UIMessage<
  ChatMessageMetadata,
  UIDataTypes,
  InferUITools<SandboxTools & HandoffTools>
>
