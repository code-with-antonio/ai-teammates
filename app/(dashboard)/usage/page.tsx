import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { format, formatDistanceToNowStrict } from "date-fns"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { getUsage, usageLimits } from "@/lib/usage"

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const hours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

function UsageMeter({
  title,
  description,
  used,
  limit,
  detail,
}: {
  title: string
  description: string
  used: number
  limit: number
  detail: string
}) {
  const percent = Math.min(100, Math.round((used / limit) * 100))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="font-medium">{percent}% used</span>
          <span className="text-muted-foreground tabular-nums">{detail}</span>
        </div>
        <Progress value={percent} aria-label={title} />
      </CardContent>
    </Card>
  )
}

export default async function Page() {
  const { userId } = await auth.protect()

  const usage = await getUsage(userId)

  if (!usage) {
    return (
      <div className="flex min-h-svh p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No usage to show</EmptyTitle>
            <EmptyDescription>
              Usage is counted on the paid plan, which is what bots and their
              sandboxes are part of.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/pricing" className={buttonVariants()}>
              See plans
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  const { period, used } = usage

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="text-muted-foreground">
          Resets in {formatDistanceToNowStrict(period.end)}, on{" "}
          <time dateTime={period.end.toISOString()}>
            {format(period.end, "MMMM d")}
          </time>
          .
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <UsageMeter
          title="AI usage"
          description="What your bots' replies cost in model tokens."
          used={used.ai}
          limit={usageLimits.ai}
          detail={`${dollars.format(used.ai / 1_000_000)} of ${dollars.format(usageLimits.ai / 1_000_000)}`}
        />
        <UsageMeter
          title="Sandbox hours"
          description="The time your bots' sandboxes were running."
          used={used.sandbox}
          limit={usageLimits.sandbox}
          detail={`${hours.format(used.sandbox / 3600)} of ${hours.format(usageLimits.sandbox / 3600)} hours`}
        />
      </div>
    </div>
  )
}
