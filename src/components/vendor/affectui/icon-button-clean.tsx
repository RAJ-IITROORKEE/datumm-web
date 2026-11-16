"use client";

import { createElement, type ComponentPropsWithRef, type ReactNode } from "react";

/*
 * Icon Button – a single self-contained file, clean style.
 * A square button that is only an icon: quiet ghost, a white tool with a hairline shadow, or a dark chip. It can stay
 * pressed (a toggle), and its label is both the accessible name and the tooltip.
 * The styles are injected below, so no extra files are needed.
 */

/** An icon from Hugeicons (e.g. `import { Search01Icon } from "@hugeicons/core-free-icons"`) – drawn inline */
export type HugeIcon = readonly (readonly [string, { readonly [key: string]: string | number }])[];

export type IconButtonProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
  /** The glyph: any element (an inline SVG) or a Hugeicons icon object */
  icon: ReactNode | HugeIcon;
  /** What the button does – read out by screen readers and shown as the tooltip */
  label: string;
  /** ghost: just the icon, a soft wash on hover · secondary: white with a hairline shadow · primary: a dark chip */
  variant?: "ghost" | "secondary" | "primary";
  /** sm: 24 × 24 · md: 28 × 28 – the hit area grows on touch screens */
  size?: "sm" | "md";
  /** Makes it a toggle: true or false sets aria-pressed and keeps it looking pressed while true */
  pressed?: boolean;
};

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  pressed,
  title,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  // Unknown values fall back to the defaults instead of an unstyled button
  const tone = VARIANTS.includes(variant) ? variant : "ghost";
  const scale = size === "sm" ? "sm" : "md";

  return (
    <>
      {/* React 19 hoists this into <head> once, no matter how many buttons render */}
      <style href="ui-icon-button-clean" precedence="default">
        {css}
      </style>
      <button
        type={type}
        className={["ui-icbc", className].filter(Boolean).join(" ")}
        data-variant={tone}
        data-size={scale}
        aria-label={label}
        // The label doubles as the tooltip; pass title="" to leave it out
        title={title ?? label}
        aria-pressed={pressed}
        {...rest}
      >
        <span className="ui-icbc__icon" aria-hidden="true">
          <Glyph icon={icon} />
        </span>
      </button>
    </>
  );
}

const VARIANTS = ["ghost", "secondary", "primary"];

const isHugeIcon = (icon: unknown): icon is HugeIcon =>
  Array.isArray(icon) && icon.length > 0 && icon.every((part) => Array.isArray(part) && typeof part[0] === "string");

/** Draws a Hugeicons icon object as an inline SVG at the button's stroke; anything else is shown as it is */
function Glyph({ icon }: { icon: ReactNode | HugeIcon }) {
  if (!isHugeIcon(icon)) return <>{icon}</>;
  return (
    <svg viewBox="0 0 24 24" fill="none" focusable="false">
      {icon.map(([tag, { key, ...attrs }], i) =>
        createElement(tag, { ...attrs, key: String(key ?? i), ...("strokeWidth" in attrs ? { strokeWidth: STROKE } : null) }),
      )}
    </svg>
  );
}
const STROKE = 1.9;

/* ---------- Styles ---------- */

const css = /* css */ `
/* Colors as variables – override them on .ui-icbc (see Theming in the docs) */
.ui-icbc {
  --ui-icbc-icon: var(--muted);
  --ui-icbc-ink: var(--ink);
  --ui-icbc-wash: var(--hover);
  --ui-icbc-pressed: var(--select);
  --ui-icbc-surface: var(--panel);
  --ui-icbc-shadow: 0 0 0 0.5px var(--line), 0 1px 1px -1px var(--aui-shadow-ink), 0 1px 2px 0 var(--aui-shadow-ink);
  --ui-icbc-shadow-hover: 0 0 0 0.5px var(--line-strong), 0 2px 6px -1px var(--aui-shadow-ink), 0 1px 2px 0 var(--aui-shadow-ink);
  --ui-icbc-line: var(--line);
  --ui-icbc-solid: var(--primary);
  --ui-icbc-solid-hover: color-mix(in srgb,var(--primary) 91%,transparent);
  --ui-icbc-on-solid: var(--primary-fg);
  --ui-icbc-focus: var(--ui-as-focus);
  --ui-icbc-ease: var(--aui-ease, cubic-bezier(.22,1,.36,1));

  --size: 28px;
  --icon: 15px;
  --radius: var(--aui-radius, 6px);

  position: relative;
  display: inline-grid;
  place-items: center;
  flex: none;
  box-sizing: border-box;
  width: var(--size);
  height: var(--size);
  padding: 0;
  margin: 0;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--ui-icbc-icon);
  font: inherit;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 140ms ease,
    color 140ms ease,
    box-shadow 140ms ease,
    transform 160ms var(--ui-icbc-ease),
    opacity 140ms ease;
}
.ui-icbc[data-size="sm"] {
  --size: 24px;
  --icon: 14px;
}

.ui-icbc__icon {
  display: grid;
  place-items: center;
  width: var(--icon);
  height: var(--icon);
  pointer-events: none;
}
.ui-icbc__icon > svg,
.ui-icbc__icon > img {
  display: block;
  width: 100%;
  height: 100%;
}

/* ghost: just the icon, a soft wash on hover */
.ui-icbc[data-variant="ghost"]:hover:not(:disabled) {
  background: var(--ui-icbc-wash);
  color: var(--ui-icbc-ink);
}
.ui-icbc[data-variant="ghost"][aria-pressed="true"] {
  background: var(--ui-icbc-pressed);
  color: var(--ui-icbc-ink);
}

/* secondary: the white tool with the card's hairline shadow */
.ui-icbc[data-variant="secondary"] {
  background: var(--ui-icbc-surface);
  box-shadow: var(--ui-icbc-shadow);
}
.ui-icbc[data-variant="secondary"]:hover:not(:disabled) {
  box-shadow: var(--ui-icbc-shadow-hover);
  color: var(--ui-icbc-ink);
}
/* Pressed sinks into a gray fill with only the hairline left */
.ui-icbc[data-variant="secondary"][aria-pressed="true"] {
  background: var(--ui-icbc-pressed);
  box-shadow: inset 0 0 0 0.5px var(--ui-icbc-line);
  color: var(--ui-icbc-ink);
}

/* primary: a dark chip */
.ui-icbc[data-variant="primary"] {
  background: var(--ui-icbc-solid);
  color: var(--ui-icbc-on-solid);
}
.ui-icbc[data-variant="primary"]:hover:not(:disabled) {
  background: var(--ui-icbc-solid-hover);
}

.ui-icbc:active:not(:disabled) {
  transform: scale(0.94);
}
.ui-icbc:focus-visible {
  outline: 2px solid var(--ui-icbc-focus);
  outline-offset: 2px;
}
.ui-icbc:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Touch screens: the look stays, an invisible ring around it takes the tap (36 × 36 at least) */
@media (pointer: coarse) {
  .ui-icbc::after {
    content: "";
    position: absolute;
    inset: -4px;
  }
  .ui-icbc[data-size="sm"]::after {
    inset: -6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-icbc {
    transition-duration: 1ms;
  }
  .ui-icbc:active:not(:disabled) {
    transform: none;
  }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .ui-icbc {
  --ui-icbc-icon: var(--muted);
  --ui-icbc-ink: var(--ink);
  --ui-icbc-wash: var(--hover);
  --ui-icbc-pressed: var(--select);
  --ui-icbc-surface: var(--panel);
  --ui-icbc-shadow: 0 0 0 0.5px var(--line), 0 1px 2px var(--aui-shadow-ink);
  --ui-icbc-shadow-hover: 0 0 0 0.5px var(--line-strong), 0 2px 6px var(--aui-shadow-ink);
  --ui-icbc-line: var(--line);
  --ui-icbc-solid: var(--primary);
  --ui-icbc-solid-hover: color-mix(in srgb,var(--primary) 91%,transparent);
  --ui-icbc-on-solid: var(--primary-fg);
  --ui-icbc-focus: var(--ui-as-focus);
}

/* Hover of the dark chip follows its fill – also a brand color from --aui-primary */
@supports (color: color-mix(in srgb, red 50%, transparent)) {
  .ui-icbc {
    --ui-icbc-solid-hover: color-mix(in srgb, var(--ui-icbc-solid) 91%, transparent);
  }
}
@media(prefers-reduced-motion:reduce){.ui-icbc,.ui-icbc *,.ui-icbc::before,.ui-icbc::after,.ui-icbc *::before,.ui-icbc *::after{animation:none!important;transition:none!important}}
[data-motion="reduce"] .ui-icbc,[data-motion="reduce"] .ui-icbc *,[data-motion="reduce"] .ui-icbc::before,[data-motion="reduce"] .ui-icbc::after,[data-motion="reduce"] .ui-icbc *::before,[data-motion="reduce"] .ui-icbc *::after{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){.ui-icbc:active:not(:disabled){transform:none}}
[data-motion="reduce"] .ui-icbc:active:not(:disabled){transform:none}
`;
