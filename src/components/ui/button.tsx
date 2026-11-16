import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { Button as AffectButton, ButtonStyles } from "@/components/vendor/affectui/button-clean"

const buttonVariants = cva(
  "ui-buttonc [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "aui-button-primary aui-button-variant-default",
        destructive: "aui-button-destructive aui-button-variant-destructive",
        outline: "aui-button-secondary aui-button-outline aui-button-variant-outline",
        secondary: "aui-button-secondary aui-button-variant-secondary",
        ghost: "aui-button-ghost aui-button-variant-ghost",
        link: "aui-button-ghost aui-button-link aui-button-variant-link",
      },
      size: {
        default: "aui-button-md aui-button-size-default",
        xs: "aui-button-sm aui-button-size-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "aui-button-sm aui-button-size-sm",
        lg: "aui-button-lg aui-button-size-lg",
        icon: "aui-button-md aui-button-icon aui-button-size-icon",
        "icon-xs": "aui-button-sm aui-button-icon-xs aui-button-size-icon-xs [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "aui-button-sm aui-button-icon-sm aui-button-size-icon-sm",
        "icon-lg": "aui-button-lg aui-button-icon-lg aui-button-size-icon-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

const vendorVariants = { default: "primary", destructive: "destructive", outline: "secondary", secondary: "secondary", ghost: "ghost", link: "ghost" } as const
const vendorSizes = { default: "md", xs: "sm", sm: "sm", lg: "lg", icon: "md", "icon-xs": "sm", "icon-sm": "sm", "icon-lg": "lg" } as const

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const appearance = variant ?? "default"
  const scale = size ?? "default"
  const classes = cn(buttonVariants({ variant: appearance, size: scale, className }))

  if (asChild) return <><ButtonStyles /><Slot.Root data-slot="button" data-variant={appearance} data-size={scale} className={classes} {...props}>{React.Children.only(props.children)}</Slot.Root></>

  return <AffectButton variant={vendorVariants[appearance]} size={vendorSizes[scale]} data-slot="button" data-variant={appearance} data-size={scale} className={classes} {...props} type={props.type ?? "submit"} />
}

export { Button, buttonVariants }
