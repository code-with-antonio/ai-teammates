import Image from "next/image"
import { Avatar, Style } from "@dicebear/core"
import definition from "@dicebear/styles/gaze.json" with { type: "json" }
import { cn } from "cn"

const style = new Style(definition)

function ChatAvatar({
  seed,
  animated = false,
  className,
}: {
  seed: string
  animated?: boolean
  className?: string
}) {
  const avatar = new Avatar(style, {
    seed,
    ...(animated && { tags: ["animation"] }),
  })

  return (
    <Image
      data-slot="chat-avatar"
      src={avatar.toDataUri()}
      alt=""
      width={32}
      height={32}
      unoptimized
      className={cn("size-8 shrink-0", className)}
    />
  )
}

export { ChatAvatar }
