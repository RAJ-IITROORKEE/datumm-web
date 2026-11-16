"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { SwitchStyles, switchClasses } from "@/components/vendor/affectui/switch-clean"

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return <><SwitchStyles /><SwitchPrimitive.Root data-slot="switch" className={cn(switchClasses.root, className)} {...props}>
    <SwitchPrimitive.Thumb className={switchClasses.thumb} />
  </SwitchPrimitive.Root></>
}

export { Switch }
