"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Lets an item close the dialog it is rendered in
const SearchCommandContext = createContext<() => void>(() => {})

// Children are the SearchCommandItems, rendered by the server so the avatars stay out of the client bundle
function SearchCommand({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <SearchCommandContext.Provider value={() => setOpen(false)}>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            variant="outline"
            tooltip="Search"
            className="text-muted-foreground group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-foreground group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:hover:bg-sidebar-accent"
            onClick={() => setOpen(true)}
          >
            <SearchIcon />
            <span>Search</span>
            <Kbd className="ml-auto">⌘K</Kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search your chats"
      >
        <Command>
          <CommandInput placeholder="Search chats..." />
          <CommandList>
            <CommandEmpty>No chats found.</CommandEmpty>
            <CommandGroup heading="Chats">{children}</CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </SearchCommandContext.Provider>
  )
}

function SearchCommandItem({
  href,
  ...props
}: Omit<React.ComponentProps<typeof CommandItem>, "onSelect"> & {
  href: string
}) {
  const router = useRouter()
  const close = useContext(SearchCommandContext)

  return (
    <CommandItem
      onSelect={() => {
        close()
        router.push(href)
      }}
      {...props}
    />
  )
}

export { SearchCommand, SearchCommandItem }
