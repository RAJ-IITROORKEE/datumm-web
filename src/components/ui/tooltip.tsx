"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { TooltipStyles, tooltipClasses } from "@/components/vendor/affectui/tooltip-clean"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  forceMount,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <>
      <TooltipStyles />
    <TooltipPrimitive.Portal forceMount={forceMount}>
      <TooltipPrimitive.Content
        forceMount={forceMount}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          tooltipClasses.content,
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className={tooltipClasses.arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
    </>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
