import { cn } from "cn"

import { ChatAvatar } from "@/components/chat-avatar"

const maxVisible = 3

// Where each item sits in the square, by how many items there are
const layouts: Record<number, string[]> = {
  1: ["inset-0 size-full"],
  // Side by side, overlapping in the middle
  2: [
    "top-1/2 left-0 size-[62%] -translate-y-1/2",
    "top-1/2 right-0 size-[62%] -translate-y-1/2",
  ],
  // A triangle
  3: [
    "top-0 left-1/2 size-[54%] -translate-x-1/2",
    "bottom-0 left-0 size-[54%]",
    "right-0 bottom-0 size-[54%]",
  ],
  // A 2x2 grid
  4: [
    "top-0 left-0 size-1/2",
    "top-0 right-0 size-1/2",
    "bottom-0 left-0 size-1/2",
    "right-0 bottom-0 size-1/2",
  ],
}

// Takes up the same square as a single ChatAvatar, however many bots it shows
function GroupChatAvatar({
  seeds,
  className,
}: {
  seeds: string[]
  className?: string
}) {
  const visible = seeds.slice(0, maxVisible)
  const hidden = seeds.length - visible.length
  const layout = layouts[visible.length + (hidden > 0 ? 1 : 0)]

  return (
    <div
      data-slot="group-chat-avatar"
      className={cn("@container relative size-8 shrink-0", className)}
    >
      {visible.map((seed, i) => (
        <ChatAvatar
          key={`${seed}-${i}`}
          seed={seed}
          className={cn("absolute", layout[i])}
        />
      ))}
      {hidden > 0 && (
        <span
          className={cn(
            // Sized off the square, so the number shrinks with the avatar
            "absolute flex items-center justify-center rounded-full bg-muted text-[28cqw] leading-none font-medium text-muted-foreground",
            layout[visible.length]
          )}
        >
          +{hidden}
        </span>
      )}
    </div>
  )
}

export { GroupChatAvatar }
