import * as React from "react"
import { NativeTextField } from "@/components/vendor/affectui/text-field-clean"
import { NativeTextArea } from "@/components/vendor/affectui/text-area-clean"
import { NativeSelect } from "@/components/vendor/affectui/select-clean"

function Input(props: React.ComponentProps<"input">) {
  return <NativeTextField data-slot="input" {...props} />
}
function Textarea(props: React.ComponentProps<"textarea">) {
  return <NativeTextArea data-slot="textarea" {...props} />
}
function Select(props: React.ComponentProps<"select">) {
  return <NativeSelect data-slot="select" {...props} />
}

export { Input, Textarea, Select }
