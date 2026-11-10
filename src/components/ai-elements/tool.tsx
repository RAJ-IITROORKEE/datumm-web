"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, WrenchIcon } from "lucide-react";
import { Collapsible } from "radix-ui";
import type { ReactNode } from "react";

export type ToolStatus = "running" | "completed" | "failed";
const MAX = 20000;
export const toolStatus = (status: string): ToolStatus => (status === "completed" ? "completed" : ["failed", "error", "cancelled", "interrupted"].includes(status) ? "failed" : "running");
const labels: Record<ToolStatus, string> = { running: "Running", completed: "Completed", failed: "Failed" };

export const Tool = ({ className, ...props }: Collapsible.CollapsibleProps) => (
  <Collapsible.Root className={cn("tool not-prose mb-2 w-full rounded-md border border-border", className)} {...props} />
);

export const ToolHeader = ({ name, status, meta }: { name: string; status: ToolStatus; meta?: ReactNode }) => (
  <Collapsible.Trigger className="group flex w-full items-center gap-2 p-2 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
    <WrenchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span className="min-w-0 flex-1 truncate font-medium">{name}{meta && <span className="ml-2 font-normal text-muted-foreground">{meta}</span>}</span>
    <Badge variant={status === "failed" ? "destructive" : "secondary"} data-status={status}>{labels[status]}</Badge>
    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
  </Collapsible.Trigger>
);

export const ToolContent = ({ className, ...props }: Collapsible.CollapsibleContentProps) => (
  <Collapsible.Content className={cn("space-y-3 border-t border-border p-3", className)} {...props} />
);

const text = (value: unknown) => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2) ?? String(value);
  return raw.length > MAX ? `${raw.slice(0, MAX)}\n… truncated (${raw.length - MAX} more characters)` : raw;
};

const Block = ({ title, value, tone }: { title: string; value: unknown; tone?: "error" }) => (
  <div>
    <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
    <pre tabIndex={0} className={cn("max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-secondary p-2 font-mono text-[11px] leading-relaxed", tone === "error" && "text-destructive")}>{text(value)}</pre>
  </div>
);

export const ToolInput = ({ input }: { input: unknown }) => <Block title="Input" value={input ?? {}} />;
export const ToolOutput = ({ output, failed }: { output: unknown; failed?: boolean }) => <Block title={failed ? "Error" : "Output"} value={output ?? "No result was recorded."} tone={failed ? "error" : undefined} />;
