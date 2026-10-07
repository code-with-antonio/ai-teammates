"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

import { toast } from "@/components/ui/toast"
import type { Feature } from "@/lib/billing"

const messages: Record<Feature, string> = {
  bots: "Bots are part of the paid plan.",
  sandboxes: "Sandboxes are part of the paid plan.",
}

// Returns a check to run before a billable action: true when the user's plan
// has the feature, otherwise false after a toast that leads to the pricing page.
// The server actions enforce the same thing; this only explains it.
export function usePaywall() {
  const { isLoaded, has } = useAuth()
  const router = useRouter()

  return React.useCallback(
    (feature: Feature) => {
      // Not known yet: let the server action decide
      if (!isLoaded || has?.({ feature })) return true

      const id = toast.add({
        type: "error",
        title: "Upgrade to continue",
        description: messages[feature],
        actionProps: {
          children: "See plans",
          onClick: () => {
            toast.close(id)
            router.push("/pricing")
          },
        },
      })
      return false
    },
    [isLoaded, has, router]
  )
}
