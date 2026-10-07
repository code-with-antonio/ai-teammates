"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { ShuffleIcon, Trash2Icon } from "lucide-react"
import { nanoid } from "nanoid"
import { Controller, useForm } from "react-hook-form"

import { createBot, deleteBot, updateBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { botInsertSchema, type Bot } from "@/db/schema"
import { usePaywall } from "@/hooks/use-paywall"

const presets = [
  {
    job: "Research assistant",
    instructions:
      "Find reliable sources, summarize what they say, and cite every claim. Say so when the evidence is thin.",
  },
  {
    job: "Code reviewer",
    instructions:
      "Review changes for bugs, security issues, and unclear code. Point to the exact lines and suggest a fix.",
  },
  {
    job: "Writing editor",
    instructions:
      "Tighten prose without changing its voice. Explain each edit briefly and flag anything ambiguous.",
  },
  {
    job: "Tutor",
    instructions:
      "Teach step by step, check understanding with questions, and give hints before giving answers.",
  },
]

// Asks for confirmation, then deletes the bot and leaves its chat
function BotDeleteButton({
  bot,
  onDeleted,
}: {
  bot: Bot
  onDeleted: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const onDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteBot(bot.id)
      toast.add({ type: "success", title: `${bot.name} is deleted` })
      onDeleted()
      router.push("/")
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't delete the bot",
        description: "Something went wrong. Try again.",
      })
      setIsDeleting(false)
    }
  }

  return (
    // Stays open while the delete is running
    <AlertDialog
      open={open}
      onOpenChange={(open) => !isDeleting && setOpen(open)}
    >
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive" className="sm:mr-auto" />
        }
      >
        <Trash2Icon data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the bot and your chat with it. It can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={onDelete}
          >
            {isDeleting && <Spinner data-icon="inline-start" />}
            Delete bot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// With a `bot` it edits that bot, without one it creates a new bot
function BotForm({ bot, onSaved }: { bot?: Bot; onSaved: () => void }) {
  const [initialSeed] = useState(() => bot?.avatar ?? nanoid())
  const form = useForm({
    resolver: zodResolver(botInsertSchema),
    defaultValues: {
      name: bot?.name ?? "",
      avatar: initialSeed,
      job: bot?.job ?? "",
      instructions: bot?.instructions ?? "",
    },
  })
  const { isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (bot) {
        const updated = await updateBot(bot.id, values)
        toast.add({ type: "success", title: `${updated.name} is updated` })
      } else {
        const created = await createBot(values)
        toast.add({ type: "success", title: `${created.name} is ready` })
      }
      onSaved()
    } catch {
      toast.add({
        type: "error",
        title: bot ? "Couldn't update the bot" : "Couldn't create the bot",
        description: "Something went wrong. Try again.",
      })
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.job}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              form.setValue("job", preset.job, {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue("instructions", preset.instructions, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          >
            {preset.job}
          </Button>
        ))}
      </div>
      <FieldGroup>
        <Controller
          name="avatar"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <ChatAvatar
                seed={field.value ?? initialSeed}
                className="size-10"
              />
              <FieldContent>
                <FieldTitle>Face</FieldTitle>
                <FieldDescription>
                  Shuffle until you find one you like.
                </FieldDescription>
              </FieldContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => field.onChange(nanoid())}
              >
                <ShuffleIcon data-icon="inline-start" />
                Shuffle
              </Button>
            </Field>
          )}
        />
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-name">Name</FieldLabel>
              <Input
                {...field}
                id="bot-name"
                placeholder="Ada"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="job"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-job">Job</FieldLabel>
              <Input
                {...field}
                id="bot-job"
                placeholder="Research assistant"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="instructions"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-instructions">
                How it should work
              </FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id="bot-instructions"
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                className="min-h-24"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        {bot && <BotDeleteButton bot={bot} onDeleted={onSaved} />}
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {bot ? "Save changes" : "Create bot"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Renders its own trigger from `children`, as `trigger` if given. Without
// children it has no trigger and is opened by the parent through `open` /
// `onOpenChange`. Pass `bot` to edit that bot instead of creating one.
function BotDialog({
  bot,
  trigger = <Button variant="secondary" />,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  bot?: Bot
  trigger?: React.ReactElement
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const checkPaywall = usePaywall()

  const setOpen = (open: boolean) => {
    // Creating a bot is billable; editing or deleting one never is
    if (open && !bot && !checkPaywall("bots")) return
    ;(onOpenChange ?? setUncontrolledOpen)(open)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger render={trigger}>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bot ? "Edit bot" : "New bot"}</DialogTitle>
          <DialogDescription>
            {bot
              ? "Change its face, its name, or the job it does."
              : "Give it a face, a name, and a job to do."}
          </DialogDescription>
        </DialogHeader>
        <BotForm bot={bot} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
