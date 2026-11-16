"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"
import { Separator as AffectSeparator } from "@/components/vendor/affectui/separator-clean"

function Separator({ orientation = "horizontal", decorative = true, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <AffectSeparator data-slot="separator" orientation={orientation} decorative={decorative} {...props} />
}

export { Separator }
