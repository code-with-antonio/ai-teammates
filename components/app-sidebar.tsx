import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"

import { ChatAvatar } from "@/components/chat-avatar"
import { CreateMenu } from "@/components/create-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getChats } from "@/queries/bots"

export async function AppSidebar() {
  const chats = await getChats()

  return (
    <Sidebar>
      <SidebarHeader className="flex-row justify-end">
        <CreateMenu />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton size="lg">
                    <ChatAvatar seed={chat.bot.avatar} />
                    <div className="grid flex-1 text-left leading-tight">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-medium">
                          {chat.name ?? chat.bot.name}
                        </span>
                        <time
                          dateTime={chat.lastMessageAt.toISOString()}
                          className="ml-auto shrink-0 text-xs text-muted-foreground"
                        >
                          {formatDistanceToNowStrict(chat.lastMessageAt)}
                        </time>
                      </div>
                      {chat.lastMessagePreview && (
                        <span className="truncate text-xs text-muted-foreground">
                          {chat.lastMessagePreview}
                        </span>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Clerk's own styles beat plain utilities, so the SidebarMenuButton classes are mirrored here as important. */}
            <UserButton
              showName
              appearance={{
                elements: {
                  rootBox: "flex! w-full!",
                  userButtonTrigger:
                    "flex! h-8! w-full! items-center! justify-start! gap-2! overflow-hidden! rounded-md! p-2! text-left! text-sm! text-sidebar-foreground! shadow-none! ring-sidebar-ring! outline-hidden! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! focus-visible:ring-2! active:bg-sidebar-accent! active:text-sidebar-accent-foreground! aria-expanded:bg-sidebar-accent! aria-expanded:text-sidebar-accent-foreground!",
                  userButtonBox: "min-w-0! flex-1! gap-2!",
                  userButtonAvatarBox: "order-first! size-6! shrink-0!",
                  userButtonOuterIdentifier:
                    "truncate! ps-0! text-left! text-sm! font-normal! text-inherit!",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
