"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon } from "lucide-react"
import { nanoid } from "nanoid"
import { Controller, useForm } from "react-hook-form"

import { createBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
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
import { botInsertSchema } from "@/db/schema"

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

function BotForm({ onCreated }: { onCreated: () => void }) {
  const [initialSeed] = useState(() => nanoid())
  const form = useForm({
    resolver: zodResolver(botInsertSchema),
    defaultValues: {
      name: "",
      avatar: initialSeed,
      job: "",
      instructions: "",
    },
  })
  const { isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const bot = await createBot(values)
      toast.add({ type: "success", title: `${bot.name} is ready` })
      onCreated()
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't create the bot",
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
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          Create bot
        </Button>
      </DialogFooter>
    </form>
  )
}

// Renders its own trigger from `children`. Without children it has no trigger
// and is opened by the parent through `open` / `onOpenChange`.
function BotDialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger render={<Button variant="secondary" />}>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New bot</DialogTitle>
          <DialogDescription>
            Give it a face, a name, and a job to do.
          </DialogDescription>
        </DialogHeader>
        <BotForm onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
