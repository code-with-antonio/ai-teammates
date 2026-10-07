import { PricingTable } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

export default async function Page() {
  await auth.protect()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Pricing</h1>
        <p className="text-muted-foreground">
          Bots and their sandboxes are part of the paid plan.
        </p>
      </div>
      {/* Checkout happens in Clerk's drawer, then lands back in the app */}
      <PricingTable newSubscriptionRedirectUrl="/" />
    </div>
  )
}
