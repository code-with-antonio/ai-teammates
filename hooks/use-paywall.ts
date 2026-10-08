"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import * as Sentry from "@sentry/nextjs"
import { useRouter } from "next/navigation"

import { hasUsageLeft } from "@/actions/usage"
import { toast } from "@/components/ui/toast"
import type { UsageKind } from "@/db/schema"
import type { Feature } from "@/lib/billing"

const planMessages: Record<Feature, string> = {
  bots: "Bots are part of the paid plan.",
  sandboxes: "Sandboxes are part of the paid plan.",
}

const usageMessages: Record<UsageKind, string> = {
  ai: "Your bots have used up their AI usage for this billing period.",
  sandbox: "Your sandbox hours for this billing period are used up.",
}

// Checks to run before a billable action. Each returns whether it may go ahead,
// and when it may not, shows a toast that leads to the page that explains why.
// The server enforces the same things; these only explain them.
export function usePaywall() {
  const { isLoaded, has } = useAuth()
  const router = useRouter()

  const block = React.useCallback(
    (title: string, description: string, label: string, href: string) => {
      const id = toast.add({
        type: "error",
        title,
        description,
        actionProps: {
          children: label,
          onClick: () => {
            toast.close(id)
            router.push(href)
          },
        },
      })
    },
    [router]
  )

  // Whether the user's plan has the feature
  const checkPlan = React.useCallback(
    (feature: Feature) => {
      // Not known yet: let the server decide
      if (!isLoaded || has?.({ feature })) return true

      Sentry.logger.info("Paywall shown: upgrade required", {
        "billing.feature": feature,
      })
      block(
        "Upgrade to continue",
        planMessages[feature],
        "See plans",
        "/pricing"
      )
      return false
    },
    [isLoaded, has, block]
  )

  const showUsageLimit = React.useCallback(
    (kind: UsageKind) => {
      Sentry.logger.info("Paywall shown: usage limit reached", {
        "usage.kind": kind,
      })
      block("Usage limit reached", usageMessages[kind], "View usage", "/usage")
    },
    [block]
  )

  // Whether the billing period has any of the allowance left. Only the ledger
  // knows, so this asks the server.
  const checkUsage = React.useCallback(
    async (kind: UsageKind) => {
      if (await hasUsageLeft(kind)) return true

      showUsageLimit(kind)
      return false
    },
    [showUsageLimit]
  )

  return { checkPlan, checkUsage, showUsageLimit }
}
