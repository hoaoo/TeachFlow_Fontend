"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.RefObject<HTMLDivElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div ref={triggerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}) {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) return <>{children}</>

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    ctx.setOpen((prev) => !prev)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        ;(children as any).props?.onClick?.(e)
        handleClick(e)
      },
    })
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode
  align?: "start" | "end"
  className?: string
}) {
  const ctx = React.useContext(DropdownMenuContext)
  const [mounted, setMounted] = React.useState(false)
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = React.useCallback(() => {
    if (!ctx?.triggerRef.current) return
    const rect = ctx.triggerRef.current.getBoundingClientRect()
    const contentEl = ctx.contentRef.current
    const contentWidth = contentEl?.offsetWidth || 192
    const contentHeight = contentEl?.offsetHeight || 220
    const margin = 6

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    let top: number

    // If not enough room below but enough room above, flip above
    if (spaceBelow < contentHeight + margin && spaceAbove >= contentHeight + margin) {
      top = rect.top - contentHeight - margin
    } else {
      top = rect.bottom + margin
    }

    let left: number
    if (align === "end") {
      left = rect.right - contentWidth
    } else {
      left = rect.left
    }

    // Keep within horizontal viewport boundaries
    if (left + contentWidth > window.innerWidth - 8) {
      left = window.innerWidth - contentWidth - 8
    }
    if (left < 8) {
      left = 8
    }

    setCoords({ top, left })
  }, [align, ctx?.triggerRef, ctx?.contentRef])

  React.useLayoutEffect(() => {
    if (ctx?.open) {
      updatePosition()
      window.addEventListener("resize", updatePosition)
      window.addEventListener("scroll", updatePosition, true)
    }
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [ctx?.open, updatePosition])

  if (!ctx || !ctx.open || !mounted) return null

  return createPortal(
    <div
      ref={ctx.contentRef}
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      className={cn(
        "z-[9999] min-w-40 rounded-xl bg-white p-1 text-slate-800 shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 focus:outline-none border border-slate-200",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  )
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  const ctx = React.useContext(DropdownMenuContext)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    ctx?.setOpen(false)
    onClick?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-slate-100", className)} />
}
