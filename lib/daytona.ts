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
