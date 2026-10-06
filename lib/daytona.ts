import { Daytona, DaytonaNotFoundError } from "@daytona/sdk"

// Reads DAYTONA_API_KEY from the environment. The endpoint is named here because
// the SDK refuses to take it from an env var that .env.local also defines.
const daytona = new Daytona({ apiUrl: "https://app.daytona.io/api" })

// Every bot owns one sandbox; the label ties it back to the bot from Daytona's side
export async function createBotSandbox(botId: string) {
  const sandbox = await daytona.create({ labels: { botId } })
  return sandbox.id
}

// A running sandbox; idle ones stop themselves and are woken here
export async function getBotSandbox(sandboxId: string) {
  const sandbox = await daytona.get(sandboxId)
  if (sandbox.state !== "started") await sandbox.start()
  return sandbox
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
