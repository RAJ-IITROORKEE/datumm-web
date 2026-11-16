"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { DialogStyles, dialogClasses } from "@/components/vendor/affectui/dialog-clean"

const Sheet = SheetPrimitive.Root
const SheetTitle = SheetPrimitive.Title
const SheetDescription = SheetPrimitive.Description
const SheetClose = SheetPrimitive.Close

/** Left-edge drawer built on the Radix dialog (focus trap, Escape, scroll lock). */
function SheetContent({ className, children, forceMount, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal forceMount={forceMount}>
      <DialogStyles />
      <SheetPrimitive.Overlay forceMount={forceMount} className={dialogClasses.overlay} />
      <SheetPrimitive.Content
        forceMount={forceMount}
        data-slot="sheet-content"
        className={cn(dialogClasses.content, className)}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export { Sheet, SheetContent, SheetTitle, SheetDescription, SheetClose }
