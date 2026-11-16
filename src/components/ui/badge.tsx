import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { Badge as AffectBadge, BadgeStyles } from "@/components/vendor/affectui/badge-clean"

const badgeVariants = cva("ui-bdgc [&_svg]:pointer-events-none [&_svg]:size-3", {
  variants: { variant: {
    default: "aui-badge-default",
    secondary: "aui-badge-secondary",
    destructive: "aui-badge-destructive",
    outline: "aui-badge-outline",
    ghost: "aui-badge-ghost",
    link: "aui-badge-link",
  } },
  defaultVariants: { variant: "default" },
})

function Badge({ className, variant, asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const appearance = variant ?? "default"
  const classes = cn(badgeVariants({ variant: appearance }), className)
  if (asChild) return <><BadgeStyles /><Slot.Root data-slot="badge" data-variant={appearance} data-size="md" className={classes} {...props}>{React.Children.only(props.children)}</Slot.Root></>
  return <AffectBadge tone={appearance === "destructive" ? "danger" : "neutral"} size="md" data-slot="badge" data-variant={appearance} className={classes} {...props} />
}

export { Badge, badgeVariants }
