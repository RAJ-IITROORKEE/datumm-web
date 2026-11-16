import * as React from "react"
import { cn } from "@/lib/utils"
import { Card as AffectCard, CardStyles } from "@/components/vendor/affectui/card-clean"

function Card(props: React.ComponentProps<"div">) {
  return <AffectCard as="div" data-slot="card" {...props} />
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <><CardStyles /><div data-slot="card-header" className={cn("ui-crdc__head", className)} {...props} /></>
}
function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <><CardStyles /><h2 data-slot="card-title" className={cn("ui-crdc__title", className)} {...props} /></>
}
function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <><CardStyles /><p data-slot="card-description" className={cn("ui-crdc__desc", className)} {...props} /></>
}

export { Card, CardHeader, CardTitle, CardDescription }
