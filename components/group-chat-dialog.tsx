"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

import { createGroupChat } from "@/actions/chat"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { groupChatInsertSchema, type Bot } from "@/db/schema"

type GroupChatBot = Pick<Bot, "id" | "name" | "avatar">

function GroupChatForm({
  bots,
  onCreated,
}: {
  bots: GroupChatBot[]
  onCreated: () => void
}) {
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(groupChatInsertSchema),
    defaultValues: { name: "", botIds: [] as string[] },
  })
  const { isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createGroupChat(values)
      toast.add({ type: "success", title: `${created.name} is ready` })
      onCreated()
      router.push(`/chats/${created.id}`)
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't create the group chat",
        description: "Something went wrong. Try again.",
      })
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="group-chat-name">Name</FieldLabel>
              <Input
                {...field}
                id="group-chat-name"
                placeholder="Weekend plans"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="botIds"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend variant="label">Bots</FieldLegend>
              {bots.length < 2 && (
                <FieldDescription>
                  A group needs at least two bots. Create more bots first.
                </FieldDescription>
              )}
              <FieldGroup data-slot="checkbox-group">
                {bots.map((bot) => (
                  <Field
                    key={bot.id}
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <Checkbox
                      id={`group-chat-bot-${bot.id}`}
                      name={field.name}
                      aria-invalid={fieldState.invalid}
                      checked={field.value.includes(bot.id)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked
                            ? [...field.value, bot.id]
                            : field.value.filter((id) => id !== bot.id)
                        )
                      }
                    />
                    <FieldLabel
                      htmlFor={`group-chat-bot-${bot.id}`}
                      className="min-w-0 items-center font-normal"
                    >
                      <ChatAvatar seed={bot.avatar} className="size-6" />
                      <span className="truncate">{bot.name}</span>
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          Create group
        </Button>
      </DialogFooter>
    </form>
  )
}

// Has no trigger of its own; the parent opens it through `open` / `onOpenChange`
function GroupChatDialog({
  bots,
  open,
  onOpenChange,
}: {
  bots: GroupChatBot[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
          <DialogDescription>
            Name the group and pick which bots are in it.
          </DialogDescription>
        </DialogHeader>
        <GroupChatForm bots={bots} onCreated={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

export { GroupChatDialog }
