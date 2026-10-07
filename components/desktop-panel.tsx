"use client"

import * as React from "react"
import type RFB from "@novnc/novnc"
import { RefreshCwIcon } from "lucide-react"

import { getDesktopUrl } from "@/actions/chat"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { Spinner } from "@/components/ui/spinner"
import { usePaywall } from "@/hooks/use-paywall"

type DesktopStatus = "idle" | "connecting" | "connected" | "disconnected"

type DesktopPanelContextValue = {
  open: boolean
  toggle: () => void
  status: DesktopStatus
  connect: () => void
  // Moves the one live screen into the given element
  attachScreen: (slot: HTMLElement) => void
  // Whether the screen takes mouse and keyboard input or is only watched
  setInteractive: (interactive: boolean) => void
}

const DesktopPanelContext =
  React.createContext<DesktopPanelContextValue | null>(null)

function useDesktopPanel() {
  const context = React.useContext(DesktopPanelContext)
  if (!context) {
    throw new Error(
      "useDesktopPanel must be used within a DesktopPanelProvider."
    )
  }
  return context
}

function DesktopPanelProvider({
  chatId,
  children,
}: {
  chatId: string
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [status, setStatus] = React.useState<DesktopStatus>("idle")
  const checkPaywall = usePaywall()

  // The VNC client draws into this element. It is never rendered by React, so
  // it can be moved between the panel and the dialog without reconnecting.
  const screenRef = React.useRef<HTMLDivElement | null>(null)
  const rfbRef = React.useRef<RFB | null>(null)
  const interactiveRef = React.useRef(false)
  // Only the latest connection attempt may report its status
  const attemptRef = React.useRef(0)

  const getScreen = React.useCallback(() => {
    if (!screenRef.current) {
      screenRef.current = document.createElement("div")
      screenRef.current.className = "size-full"
    }
    return screenRef.current
  }, [])

  const connect = React.useCallback(async () => {
    const attempt = ++attemptRef.current
    rfbRef.current?.disconnect()
    rfbRef.current = null
    setStatus("connecting")

    try {
      const [url, { default: RFB }] = await Promise.all([
        getDesktopUrl(chatId),
        import("@novnc/novnc"),
      ])
      if (attempt !== attemptRef.current) return

      const rfb = new RFB(getScreen(), url)
      rfb.scaleViewport = true
      rfb.background = "transparent"
      rfb.viewOnly = !interactiveRef.current
      rfb.addEventListener("connect", () => {
        if (attempt !== attemptRef.current) return
        setStatus("connected")
        if (interactiveRef.current) rfb.focus()
      })
      rfb.addEventListener("disconnect", () => {
        if (attempt !== attemptRef.current) return
        rfbRef.current = null
        setStatus("disconnected")
      })
      rfbRef.current = rfb
    } catch {
      if (attempt === attemptRef.current) setStatus("disconnected")
    }
  }, [chatId, getScreen])

  const toggle = React.useCallback(() => {
    if (!open && !checkPaywall("sandboxes")) return
    // Connect the first time the panel opens and keep it for later opens
    if (!open && status === "idle") connect()
    setOpen(!open)
  }, [open, status, connect, checkPaywall])

  const attachScreen = React.useCallback(
    (slot: HTMLElement) => {
      slot.appendChild(getScreen())
    },
    [getScreen]
  )

  const setInteractive = React.useCallback((interactive: boolean) => {
    interactiveRef.current = interactive
    const rfb = rfbRef.current
    if (!rfb) return
    rfb.viewOnly = !interactive
    if (interactive) rfb.focus()
  }, [])

  React.useEffect(() => {
    return () => {
      attemptRef.current++
      rfbRef.current?.disconnect()
      rfbRef.current = null
    }
  }, [])

  const value = React.useMemo(
    () => ({ open, toggle, status, connect, attachScreen, setInteractive }),
    [open, toggle, status, connect, attachScreen, setInteractive]
  )

  return <DesktopPanelContext value={value}>{children}</DesktopPanelContext>
}

function DesktopPanel({ name }: { name: string }) {
  const { open, status, connect, attachScreen, setInteractive } =
    useDesktopPanel()
  const [fullscreen, setFullscreen] = React.useState(false)
  const [panelSlot, setPanelSlot] = React.useState<HTMLDivElement | null>(null)
  const [dialogSlot, setDialogSlot] = React.useState<HTMLDivElement | null>(
    null
  )

  // The dialog's slot only exists while it is open, and wins while it does
  React.useLayoutEffect(() => {
    const slot = dialogSlot ?? panelSlot
    if (!slot) return
    attachScreen(slot)
    setInteractive(slot === dialogSlot)
  }, [dialogSlot, panelSlot, attachScreen, setInteractive])

  if (!open) return null

  const title = `${name}'s screen`

  return (
    <>
      <ResizableHandle withHandle />
      <ResizablePanel id="desktop" defaultSize="50%" minSize="20%">
        <Dialog
          open={fullscreen}
          onOpenChange={(open, eventDetails) => {
            // Escape belongs to the desktop; only the close button closes
            if (!open && eventDetails.reason !== "close-press") return
            setFullscreen(open)
          }}
          disablePointerDismissal
        >
          <div className="flex h-full flex-col">
            <div className="flex h-12 shrink-0 items-center justify-end px-4">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Reconnect"
                disabled={status === "connecting"}
                onClick={connect}
              >
                <RefreshCwIcon />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center gap-4 p-4 pt-0">
              <AspectRatio
                ratio={4 / 3}
                className="w-full max-w-2xl overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10"
              >
                <div ref={setPanelSlot} className="absolute inset-0" />
                {status === "connected" ? (
                  <DialogTrigger
                    aria-label={`Open ${title} in fullscreen`}
                    className="absolute inset-0 cursor-zoom-in rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    {status === "disconnected" ? (
                      "Screen disconnected"
                    ) : (
                      <Spinner />
                    )}
                  </div>
                )}
              </AspectRatio>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
          <DialogContent
            initialFocus={false}
            className="flex h-svh max-w-none flex-col gap-0 rounded-none p-0 ring-0 sm:max-w-none"
          >
            <DialogHeader className="h-12 shrink-0 justify-center border-b px-4">
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div ref={setDialogSlot} className="min-h-0 flex-1 bg-muted" />
          </DialogContent>
        </Dialog>
      </ResizablePanel>
    </>
  )
}

export { DesktopPanel, DesktopPanelProvider, useDesktopPanel }
