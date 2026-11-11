"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root
const SheetTitle = SheetPrimitive.Title
const SheetDescription = SheetPrimitive.Description
const SheetClose = SheetPrimitive.Close

/** Left-edge drawer built on the Radix dialog (focus trap, Escape, scroll lock). */
function SheetContent({ className, children, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn("fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r bg-card text-foreground shadow-lg outline-none", className)}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export { Sheet, SheetContent, SheetTitle, SheetDescription, SheetClose }
