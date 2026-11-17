"use client"

import { useId } from "react"
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { groupModels, modelFacts, modelName, type ModelInfoMap } from "@/lib/model-display.mjs"
import { PopoverStyles, popoverClasses } from "./vendor/affectui/popover-clean"
import styles from "./composer-controls.module.css"

export type ReasoningEffort = "low" | "medium" | "high"

const effortOptions: { value: ReasoningEffort; title: string; description: string }[] = [
  { value: "low", title: "Low", description: "Faster for straightforward requests" },
  { value: "medium", title: "Medium", description: "A balanced level of reasoning" },
  { value: "high", title: "High", description: "More reasoning for complex work" },
]

export function ModelPicker({
  model,
  models,
  modelInfo,
  defaultModel,
  reasoningEffort,
  onModelChange,
  onReasoningEffortChange,
  disabled = false,
}: {
  model: string
  models: string[]
  /** Present only when the service reports capability modelInfo. */
  modelInfo?: ModelInfoMap
  defaultModel?: string
  reasoningEffort: ReasoningEffort
  onModelChange: (model: string) => void
  onReasoningEffortChange: (effort: ReasoningEffort) => void
  disabled?: boolean
}) {
  const availableModels = models.length ? models : [model]
  const selectedEffort = effortOptions.find((option) => option.value === reasoningEffort) ?? effortOptions[2]
  const effortIndex = effortOptions.indexOf(selectedEffort)
  const groups = groupModels(availableModels, defaultModel)
  const price = modelFacts(modelInfo?.[model]).find((fact) => fact.includes("per M"))
  const contentId = useId()
  const sliderId = useId()

  return (
    <PopoverPrimitive.Root>
      <PopoverStyles />
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={styles.pickerTrigger}
          aria-label={`Configure model and reasoning effort. ${modelName(model)}${price ? `, ${price}` : ""}, ${selectedEffort.title} reasoning.`}
          aria-controls={contentId}
          disabled={disabled}
        >
          <span className={styles.pickerModelName}>{modelName(model)}</span>
          <ChevronDown className={styles.pickerChevron} size={16} strokeWidth={1.9} aria-hidden="true" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          id={contentId}
          className={`${popoverClasses.content} ${styles.pickerPopover}`}
          align="end"
          side="top"
          sideOffset={10}
          aria-label="Model and reasoning configuration"
        >
          <div className={styles.effortHeader}>
            <div>
              <span className={styles.sectionLabel}>Reasoning effort</span>
              <output htmlFor={sliderId} className={styles.effortValue} aria-live="polite">{selectedEffort.title}</output>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.resetEffort}
              aria-label="Reset reasoning effort to High"
              title="Reset effort"
              disabled={disabled}
              onClick={() => onReasoningEffortChange("high")}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </Button>
          </div>
          <label className={styles.sliderLabel} htmlFor={sliderId}>
            <span className={styles.srOnly}>Reasoning effort</span>
            <input
              id={sliderId}
              className={styles.effortSlider}
              type="range"
              disabled={disabled}
              min={0}
              max={effortOptions.length - 1}
              step={1}
              value={effortIndex}
              aria-valuetext={`${selectedEffort.title}: ${selectedEffort.description}`}
              onChange={(event) => onReasoningEffortChange(effortOptions[Number(event.currentTarget.value)].value)}
            />
          </label>
          <div className={styles.effortTicks} aria-hidden="true">
            {effortOptions.map((option) => <span key={option.value}>{option.title}</span>)}
          </div>
          <p className={styles.effortDescription}>{selectedEffort.description}</p>
          <div className={styles.modelSelection}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" disabled={disabled} className={styles.modelSubmenuTrigger}>
                  <span>
                    <span className={styles.sectionLabel}>Model</span>
                    <strong>{modelName(model)}</strong>
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={styles.modelSubmenu} side="right" align="start" sideOffset={5}>
                <DropdownMenuLabel>Choose a model</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={model} onValueChange={onModelChange}>
                  {groups.map((group, index) => (
                    <DropdownMenuGroup key={group.provider} aria-label={group.provider}>
                      {index > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel>{group.provider}</DropdownMenuLabel>
                      {group.models.map((option) => {
                        const facts = modelFacts(modelInfo?.[option])
                        return (
                          <DropdownMenuRadioItem key={option} value={option} disabled={disabled} className={styles.modelOption}>
                            <span className={styles.modelOptionCopy}>
                              <span>{modelName(option)}</span>
                              {facts.length > 0 && <small>{facts.join(" · ")}</small>}
                            </span>
                          </DropdownMenuRadioItem>
                        )
                      })}
                    </DropdownMenuGroup>
                  ))}
                </DropdownMenuRadioGroup>
                <p className={styles.modelNote}>Requests go to the model provider through OpenRouter.</p>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
