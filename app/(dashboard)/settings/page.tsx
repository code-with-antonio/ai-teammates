import { auth } from "@clerk/nextjs/server"

import { MODELS } from "@/lib/model"

export default async function Page() {
  await auth.protect()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Configure your preferences.</p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Available models</h2>
          <p className="text-sm text-muted-foreground">
            Models available for your bots to use.
          </p>
          <ul className="flex flex-col gap-3">
            {MODELS.map((entry) => ({
              id: entry.id,
              label: entry.label,
              description: entry.description,
            })).map((model) => (
              <li
                key={model.id}
                className="flex flex-col rounded-md border p-3"
              >
                <span className="font-medium">{model.label}</span>
                <span className="text-sm text-muted-foreground">
                  {model.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
