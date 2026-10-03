"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
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

// Lets an item close the dialog it is rendered in
const SearchCommandContext = createContext<() => void>(() => {})

// Children are the SearchCommandItems, rendered by the server so the avatars stay out of the client bundle
function SearchCommand({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <SearchCommandContext.Provider value={() => setOpen(false)}>
      {/* Mirrors the Input classes on top of the outline button, which keeps its own hover. */}
      <Button
        variant="outline"
        className="w-full min-w-0 justify-start border-input bg-transparent px-2.5 py-1 text-base font-normal text-muted-foreground md:text-sm"
        onClick={() => setOpen(true)}
      >
        <SearchIcon data-icon="inline-start" />
        Search
        <Kbd className="ml-auto">⌘K</Kbd>
      </Button>
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
