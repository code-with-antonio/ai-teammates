import { UserButton } from "@clerk/nextjs"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent />
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
