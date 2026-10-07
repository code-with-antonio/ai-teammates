"use client"

import { useState } from "react"
import { PlusIcon, UsersIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Bot } from "@/db/schema"
import { usePaywall } from "@/hooks/use-paywall"

function CreateMenu({ bots }: { bots: Pick<Bot, "id" | "name" | "avatar">[] }) {
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const [groupChatDialogOpen, setGroupChatDialogOpen] = useState(false)
  const { checkPlan, checkUsage } = usePaywall()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="Create" />}
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={async () => {
              // A new bot's sandbox starts running right away
              if (checkPlan("bots") && (await checkUsage("sandbox"))) {
                setBotDialogOpen(true)
              }
            }}
          >
            <PlusIcon />
            Create new bot
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setGroupChatDialogOpen(true)}>
            <UsersIcon />
            Create group chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
      <GroupChatDialog
        bots={bots}
        open={groupChatDialogOpen}
        onOpenChange={setGroupChatDialogOpen}
      />
    </>
  )
}

export { CreateMenu }
