"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type ReasoningProps = {
  /** True while the agent is still working: opens the panel, then collapses when it ends. */
  isStreaming?: boolean;
  /** Keep the panel open regardless (for example while waiting for the user). */
  forceOpen?: boolean;
  summary: ReactNode;
  className?: string;
  children: ReactNode;
};

/** ChatGPT-style "Worked · N steps" disclosure: open while streaming, collapsed once done. */
export const Reasoning = ({ isStreaming = false, forceOpen = false, summary, className, children }: ReasoningProps) => {
  const [open, setOpen] = useState(isStreaming || forceOpen);
  const was = useRef(isStreaming);
  useEffect(() => {
    if (isStreaming || forceOpen) setOpen(true);
    else if (was.current) setOpen(false);
    was.current = isStreaming;
  }, [isStreaming, forceOpen]);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className={cn("reasoning not-prose my-2 w-full", className)}>
      <Collapsible.Trigger className="reasoning-trigger group flex w-full items-center gap-2 rounded-md py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
      </Collapsible.Trigger>
      <Collapsible.Content className="reasoning-content mt-1 border-l border-border pl-3">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
};
