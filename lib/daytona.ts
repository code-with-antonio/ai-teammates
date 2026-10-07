import { Daytona, DaytonaNotFoundError, type Sandbox } from "@daytona/sdk"

// Reads DAYTONA_API_KEY from the environment. The endpoint is named here because
// the SDK refuses to take it from an env var that .env.local also defines.
const daytona = new Daytona({ apiUrl: "https://app.daytona.io/api" })

// A bot's notes to itself, in its sandbox's home directory. Chats don't share
// their transcripts, so this is what a bot carries from one chat to another.
export const MEMORY_FILE = "MEMORY.md"

// Every bot owns one sandbox; the label ties it back to the bot from Daytona's side
export async function createBotSandbox(botId: string) {
  const sandbox = await daytona.create({ labels: { botId } })

  try {
    // Blank until the bot has something worth keeping. A command rather than
    // an upload: the SDK's uploads can't load their form-data module when
    // Next.js has bundled it. Commands start in the home directory.
    const { exitCode, result } = await sandbox.process.executeCommand(
      `touch ${MEMORY_FILE}`
    )
    if (exitCode !== 0)
      throw new Error(`Creating ${MEMORY_FILE} failed: ${result}`)
  } catch (error) {
    // A sandbox nobody got the ID of would never be deleted
    await daytona.delete(sandbox).catch(() => {})
    throw error
  }

  return sandbox.id
}

// A running sandbox; idle ones stop themselves and are woken here
export async function getBotSandbox(sandboxId: string) {
  const sandbox = await daytona.get(sandboxId)
  if (sandbox.state !== "started") await sandbox.start()
  return sandbox
}

// Everything a bot has saved to its memory. Bots older than the file have none
// until this makes it.
export async function readBotMemory(sandbox: Sandbox) {
  const { exitCode, result } = await sandbox.process.executeCommand(
    `touch ${MEMORY_FILE} && cat ${MEMORY_FILE}`
  )
  if (exitCode !== 0)
    throw new Error(`Reading ${MEMORY_FILE} failed: ${result}`)
  return result
}

// Where the sandbox image serves noVNC and its websocket
const VNC_PORT = 6080

// A websocket address a browser can open the bot's desktop on. The address
// carries its own access, good for this port only and for an hour.
export async function getBotDesktopUrl(sandboxId: string) {
  const sandbox = await getBotSandbox(sandboxId)

  // Starting is slow even when everything is up, so ask first
  const { status } = await sandbox.computerUse.getStatus()
  if (status !== "active") await sandbox.computerUse.start()

  const preview = await sandbox.getSignedPreviewUrl(VNC_PORT, 60 * 60)
  const url = new URL("/websockify", preview.url)
  url.protocol = "wss:"
  return url.toString()
}

export async function deleteBotSandbox(sandboxId: string) {
  try {
    const sandbox = await daytona.get(sandboxId)
    await daytona.delete(sandbox)
  } catch (error) {
    // Already gone is as good as deleted
    if (error instanceof DaytonaNotFoundError) return
    throw error
  }
}

// The IDs of every sandbox that is running or on its way in or out of it, which
// is when Daytona bills for its CPU and memory
export async function listRunningSandboxIds() {
  const ids: string[] = []
  for await (const sandbox of daytona.list({
    states: ["started", "starting", "stopping"],
  })) {
    ids.push(sandbox.id)
  }
  return ids
}

// Its files stay, and it starts again the next time it is used
export async function stopBotSandbox(sandboxId: string) {
  const sandbox = await daytona.get(sandboxId)
  if (sandbox.state === "started") await sandbox.stop()
}
