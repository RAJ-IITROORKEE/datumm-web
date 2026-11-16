"use client";

import {
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type SyntheticEvent,
  type ReactNode,
} from "react";

/*
 * Button – a single self-contained file, clean style.
 * Clean style: a dark chip, a white button with hairline shadows, a quiet ghost and a minimal red fill.
 * The styles are injected below, so no extra files are needed.
 */

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  /** primary: a dark chip · secondary: white with a hairline shadow · ghost: text only · destructive: a light red fill, for deleting */
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  /** Shows a shimmer over the label and blocks clicks */
  loading?: boolean;
  /** Icon before the label, e.g. an inline SVG */
  icon?: ReactNode;
  /** Icon after the label */
  iconRight?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  children,
  className,
  disabled,
  onClick,
  onPointerEnter,
  type = "button",
  ref,
  ...rest
}: ButtonProps) {
  // The shimmer copies the label, so it only works on plain text
  const text = typeof children === "string" ? children : undefined;
  // An empty string or false is no label – the icon stays centered
  const hasLabel = children != null && children !== false && children !== "";
  const iconOnly = !hasLabel && Boolean(icon || iconRight);
  // Unknown values fall back to the defaults instead of an unstyled button
  const tone = VARIANTS.includes(variant) ? variant : "primary";
  const scale = SIZES.includes(size) ? size : "md";

  // Morph: when label or icon change, the width glides to its new size and the new content blurs in.
  // Nothing animates on the first render.
  const inner = useRef<HTMLButtonElement | null>(null);
  const morph = useRef<Animation | null>(null);
  const reducesMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "reduce";
  const lastWidth = useRef(0);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const labelKey = text ?? "label";
  const iconKey = loading && icon ? "spinner" : contentKey(icon);
  const iconRightKey = contentKey(iconRight);

  const content = `${labelKey}|${iconKey}|${iconRightKey}`;
  const lastContent = useRef(content);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cancel = () => {
      morph.current?.cancel();
      morph.current = null;
    };
    const update = () => { if (reducesMotion()) cancel(); };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    media.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      cancel();
    };
  }, []);

  // Runs after every render, so the remembered width is always current
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    const from = lastWidth.current;
    const changed = lastContent.current !== content;
    lastWidth.current = width;
    lastContent.current = content;
    if (!changed || !from || Math.abs(from - width) < 0.5) return;
    morph.current?.cancel();
    morph.current = null;
    if (reducesMotion()) return;
    morph.current = el.animate([{ width: `${from}px` }, { width: `${width}px` }], {
      duration: 480,
      easing: "cubic-bezier(.22, 1, .36, 1)",
    });
  });

  return (
    <>
      {/* React 19 hoists this into <head> once, no matter how many buttons render */}
      <style href="ui-button-clean" precedence="default">
        {css}
      </style>
      <button
        type={type}
        className={["ui-buttonc", className].filter(Boolean).join(" ")}
        data-variant={tone}
        data-size={scale}
        data-loading={loading || undefined}
        data-icon-only={iconOnly || undefined}
        data-icon-left={(!iconOnly && Boolean(icon)) || undefined}
        data-icon-right={(!iconOnly && Boolean(iconRight)) || undefined}
        data-ready={ready || undefined}
        ref={(el) => {
          inner.current = el;
          const cleanup = typeof ref === "function" ? ref(el) : undefined;
          if (ref && typeof ref !== "function") ref.current = el;
          return () => {
            inner.current = null;
            if (typeof cleanup === "function") cleanup();
            else if (typeof ref === "function") ref(null);
            else if (ref) ref.current = null;
          };
        }}
        disabled={disabled}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        onClick={(event) => {
          if (loading) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        onPointerEnter={(event) => {
          // A label cut short shows its full text on hover
          const label = event.currentTarget.querySelector<HTMLElement>(".ui-buttonc__label");
          if (label && text && !rest.title) label.title = label.scrollWidth > label.clientWidth + 1 ? text : "";
          onPointerEnter?.(event);
        }}
        {...rest}
      >
        {/* New keys remount the parts that changed, which replays their enter animation */}
        {icon && (
          <span className="ui-buttonc__icon" aria-hidden="true" key={`icon-${iconKey}`} onErrorCapture={hideBroken}>
            {loading ? <Spinner /> : icon}
          </span>
        )}
        {hasLabel && (
          <span className="ui-buttonc__label" data-text={text} dir="auto" key={`label-${labelKey}`}>
            {children}
          </span>
        )}
        {iconRight && (
          <span className="ui-buttonc__icon" aria-hidden="true" key={`icon-right-${iconRightKey}`} onErrorCapture={hideBroken}>
            {iconRight}
          </span>
        )}
      </button>
    </>
  );
}

const VARIANTS = ["primary", "secondary", "ghost", "destructive"];
const SIZES = ["sm", "md", "lg"];

/** An icon image that fails to load leaves an empty slot instead of a broken-image glyph */
const hideBroken = (event: SyntheticEvent<HTMLElement>) => {
  if (event.target instanceof HTMLImageElement) event.target.style.visibility = "hidden";
};

/** Shown in place of the left icon while loading */
const Spinner = () => (
  <svg
    className="ui-buttonc__spinner"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="8.5" opacity={0.2} />
    <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" />
  </svg>
);

/** A stable id per icon component, so swapping e.g. <CopyIcon /> for <CheckIcon /> counts as a change */
const ids = new WeakMap<object, number>();
let nextId = 1;
function contentKey(node: ReactNode) {
  if (!isValidElement(node) || typeof node.type === "string") return 0;
  const type = node.type as object;
  if (!ids.has(type)) ids.set(type, nextId++);
  return ids.get(type)!;
}

/* ---------- Styles ---------- */


/** DATUMM: licensed visuals only; the existing native/Radix owner handles interaction. */
export function ButtonStyles() {
  return <style href="ui-button-clean" precedence="default">{css}</style>;
}
const css = /* css */ `
/* Colors and motion as variables – override them on .ui-buttonc (see Theming in the docs) */
.ui-buttonc {
  --ui-btnc-title: var(--ink);
  --ui-btnc-ink: var(--ink);
  --ui-btnc-muted: var(--aui-text);
  --ui-btnc-icon: var(--muted);
  --ui-btnc-solid: var(--primary);
  --ui-btnc-solid-hover: color-mix(in srgb,var(--primary) 91%,transparent);
  --ui-btnc-on-solid: var(--primary-fg);
  --ui-btnc-surface: var(--panel);
  --ui-btnc-shadow: 0 0 0 0.5px var(--line), 0 1px 1px -1px var(--aui-shadow-ink), 0 1px 2px 0 var(--aui-shadow-ink);
  --ui-btnc-shadow-hover: 0 0 0 0.5px var(--line-strong), 0 1px 1px -1px var(--aui-shadow-ink), 0 1px 3px 0 var(--aui-shadow-ink);
  --ui-btnc-wash: var(--hover);
  --ui-btnc-danger: var(--aui-danger);
  --ui-btnc-danger-bg: var(--aui-danger-soft);
  --ui-btnc-danger-bg-hover: var(--aui-danger-soft);
  --ui-btnc-shine: var(--primary-fg);
  --ui-btnc-shine-on-solid: var(--primary-fg);
  --ui-btnc-focus: var(--ui-as-focus);
  --ui-btnc-ease: var(--aui-ease, cubic-bezier(.22,1,.36,1));
  --ui-btnc-load: 650ms;

  --h: 28px;
  --px: 10px;
  --gap: 6px;
  --fs: 13px;
  --lh: 20px;
  --icon: 16px;
  --radius: var(--aui-radius, 6px);

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap);
  box-sizing: border-box;
  height: var(--h);
  padding: 0 var(--px);
  margin: 0;
  border: 0;
  border-radius: var(--radius);
  font-family: var(--aui-font, "Inter", "InterVariable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  font-size: var(--fs);
  font-weight: 500;
  line-height: var(--lh);
  letter-spacing: 0;
  max-width: 100%;
  min-width: 0;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
  transition:
    background-color 140ms ease,
    color 140ms ease,
    box-shadow 140ms ease,
    transform 160ms var(--ui-btnc-ease),
    opacity 140ms ease;
}

/* Sizes: 24 · 28 · 32 high (taller on touch screens, see below) */
.ui-buttonc:is([data-size="sm"], .aui-button-sm) {
  --h: 24px;
  --px: 8px;
  --gap: 4px;
  --fs: 12px;
  --lh: 16px;
  --icon: 14px;
  --radius: var(--aui-radius, 6px);
}
.ui-buttonc:is([data-size="lg"], .aui-button-lg) {
  --h: 32px;
  --px: 12px;
  --gap: 6px;
  --fs: 13px;
  --icon: 16px;
  --radius: var(--aui-radius, 6px);
}
/* Touch screens: every size grows to a comfortable tap height – 32 · 34 · 36 – the look stays the same */
@media (pointer: coarse) {
  .ui-buttonc:is([data-size="sm"], .aui-button-sm) { --h: 32px; }
  .ui-buttonc:is([data-size="md"], .aui-button-md) { --h: 34px; }
  .ui-buttonc:is([data-size="lg"], .aui-button-lg) { --h: 36px; }
}
/* An icon sits closer to the edge than the text, so both look evenly spaced */
.ui-buttonc[data-icon-left] {
  padding-left: calc(var(--px) - 2px);
}
.ui-buttonc[data-icon-right] {
  padding-right: calc(var(--px) - 2px);
}
.ui-buttonc[data-icon-only] {
  width: var(--h);
  padding: 0;
}

/* primary: a dark chip */
.ui-buttonc:is([data-variant="primary"], .aui-button-primary) {
  background: var(--ui-btnc-solid);
  color: var(--ui-btnc-on-solid);
}
.ui-buttonc:is([data-variant="primary"], .aui-button-primary):hover:not(:disabled) {
  background: var(--ui-btnc-solid-hover);
}

/* secondary: white with the card's hairline shadow */
.ui-buttonc:is([data-variant="secondary"], .aui-button-secondary) {
  background: var(--ui-btnc-surface);
  color: var(--ui-btnc-title);
  box-shadow: var(--ui-btnc-shadow);
}
.ui-buttonc:is([data-variant="secondary"], .aui-button-secondary) .ui-buttonc__icon {
  color: var(--ui-btnc-icon);
}
.ui-buttonc:is([data-variant="secondary"], .aui-button-secondary):hover:not(:disabled) {
  box-shadow: var(--ui-btnc-shadow-hover);
}

/* ghost: a muted label, a soft wash appears on hover */
.ui-buttonc:is([data-variant="ghost"], .aui-button-ghost) {
  background: transparent;
  color: var(--ui-btnc-muted);
}
.ui-buttonc:is([data-variant="ghost"], .aui-button-ghost) .ui-buttonc__icon {
  color: var(--ui-btnc-icon);
}
.ui-buttonc:is([data-variant="ghost"], .aui-button-ghost):hover:not(:disabled) {
  background: var(--ui-btnc-wash);
  color: var(--ui-btnc-ink);
}
.ui-buttonc:is([data-variant="ghost"], .aui-button-ghost):hover:not(:disabled) .ui-buttonc__icon {
  color: var(--ui-btnc-ink);
}

/* destructive: red label on a minimal red fill, no stroke */
.ui-buttonc:is([data-variant="destructive"], .aui-button-destructive) {
  background: var(--ui-btnc-danger-bg);
  color: var(--ui-btnc-danger);
}
.ui-buttonc:is([data-variant="destructive"], .aui-button-destructive):hover:not(:disabled) {
  background: var(--ui-btnc-danger-bg-hover);
}

.ui-buttonc .ui-buttonc__icon {
  transition: color 140ms ease;
}
.ui-buttonc:active:not(:disabled):not([data-loading]) {
  transform: scale(0.97);
}
.ui-buttonc:focus-visible {
  outline: 2px solid var(--ui-btnc-focus);
  outline-offset: 2px;
}
.ui-buttonc:disabled {
  opacity: 0.4;
  cursor: default;
}
.ui-buttonc[data-loading] {
  cursor: default;
}

.ui-buttonc__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--icon);
  height: var(--icon);
}
.ui-buttonc__icon {
  overflow: hidden;
}
.ui-buttonc__icon > svg,
.ui-buttonc__icon > img {
  display: block;
  width: 100%;
  height: 100%;
}
.ui-buttonc__icon > img {
  object-fit: contain;
}

/* Morph: the button clips while its width glides; changed parts blur in */
.ui-buttonc {
  overflow: clip;
}
.ui-buttonc[data-ready] .ui-buttonc__label {
  animation: ui-buttonc-label-in 480ms cubic-bezier(0.25, 1, 0.5, 1) both;
}
.ui-buttonc[data-ready] .ui-buttonc__icon {
  animation: ui-buttonc-icon-in 520ms cubic-bezier(0.25, 1, 0.5, 1) both;
}

/* Loading: a light band sweeps across a copy of the dimmed label */
/* A label too long for its parent ends in "…" – the full text shows on hover */
.ui-buttonc__label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: inherit;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ui-buttonc__label::after {
  content: attr(data-text);
  content: attr(data-text) / "";
  position: absolute;
  inset: 0;
  white-space: nowrap;
  color: transparent;
  background: linear-gradient(90deg, transparent 38%, var(--ui-btnc-shine) 50%, transparent 62%) 100% 0 / 300% 100%
    no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  opacity: 0;
  pointer-events: none;
}
.ui-buttonc:is([data-variant="primary"], .aui-button-primary) .ui-buttonc__label::after {
  --ui-btnc-shine: var(--ui-btnc-shine-on-solid);
}
.ui-buttonc[data-loading] .ui-buttonc__label {
  color: color-mix(in srgb, currentColor 50%, transparent);
}
.ui-buttonc[data-loading] .ui-buttonc__label::after {
  opacity: 1;
  animation: ui-buttonc-sweep calc(var(--ui-btnc-load) * 1.6) linear infinite;
}
.ui-buttonc__spinner {
  animation: ui-buttonc-spin 900ms linear infinite;
}

@keyframes ui-buttonc-label-in {
  from {
    opacity: 0;
    filter: blur(3px);
    transform: translateY(25%);
  }
}
@keyframes ui-buttonc-icon-in {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: scale(0.7);
  }
}

@keyframes ui-buttonc-spin {
  to {
    transform: rotate(1turn);
  }
}

@keyframes ui-buttonc-sweep {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: 0% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-buttonc[data-ready] .ui-buttonc__label,
  .ui-buttonc[data-ready] .ui-buttonc__icon {
    animation: none;
  }
  .ui-buttonc {
    transition-duration: 1ms;
  }
  .ui-buttonc[data-loading] .ui-buttonc__label::after {
    animation: none;
    opacity: 0;
  }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .ui-buttonc {
  /* primary inverts: a light chip with dark text */
  --ui-btnc-solid: var(--primary);
  --ui-btnc-solid-hover: color-mix(in srgb,var(--primary) 91%,transparent);
  --ui-btnc-on-solid: var(--primary-fg);
  --ui-btnc-shine-on-solid: var(--primary-fg);

  --ui-btnc-title: var(--ink);
  --ui-btnc-ink: var(--ink);
  --ui-btnc-muted: var(--aui-text);
  --ui-btnc-icon: var(--muted);
  --ui-btnc-surface: var(--panel);
  --ui-btnc-shadow: 0 0 0 0.5px var(--line), 0 1px 2px 0 var(--aui-shadow-ink);
  --ui-btnc-shadow-hover: 0 0 0 0.5px var(--line-strong), 0 1px 2px 0 var(--aui-shadow-ink);
  --ui-btnc-wash: var(--hover);
  --ui-btnc-danger: var(--aui-danger);
  --ui-btnc-danger-bg: var(--aui-danger-soft);
  --ui-btnc-danger-bg-hover: var(--aui-danger-soft);
  --ui-btnc-shine: var(--primary-fg);
  --ui-btnc-focus: var(--ui-as-focus);
}

/* Hover of the primary button follows its fill – also a brand color from --aui-primary. Browsers without
   color-mix() (Safari before 16.2) keep the fixed hover above */
@supports (color: color-mix(in srgb, red 50%, transparent)) {
  .ui-buttonc {
    --ui-btnc-solid-hover: color-mix(in srgb, var(--ui-btnc-solid) 91%, transparent);
  }
}
.ui-buttonc.aui-button-md {--h:28px;--px:10px;--gap:6px;--fs:13px;--lh:20px;--icon:16px;
}
.ui-buttonc.aui-button-outline {background:var(--panel);color:var(--ink);box-shadow:inset 0 0 0 .5px var(--line-strong);
}
.ui-buttonc.aui-button-outline:hover:not(:disabled) {background:var(--hover);
}
.ui-buttonc.aui-button-link {background:transparent;box-shadow:none;color:var(--ink);text-underline-offset:4px;
}
.ui-buttonc.aui-button-link:hover:not(:disabled) {background:transparent;text-decoration:underline;
}
@media(prefers-reduced-motion:reduce){.ui-buttonc,.ui-buttonc *,.ui-buttonc::before,.ui-buttonc::after,.ui-buttonc *::before,.ui-buttonc *::after{animation:none!important;transition:none!important}}
[data-motion="reduce"] .ui-buttonc,[data-motion="reduce"] .ui-buttonc *,[data-motion="reduce"] .ui-buttonc::before,[data-motion="reduce"] .ui-buttonc::after,[data-motion="reduce"] .ui-buttonc *::before,[data-motion="reduce"] .ui-buttonc *::after{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){.ui-buttonc:active:not(:disabled){transform:none}}
[data-motion="reduce"] .ui-buttonc:active:not(:disabled){transform:none}

/* Square wrapper variants keep one native control with arbitrary children. */
.ui-buttonc.aui-button-icon {width:28px;height:28px;padding:0}
.ui-buttonc.aui-button-icon-xs,.ui-buttonc.aui-button-icon-sm {width:24px;height:24px;padding:0}
.ui-buttonc.aui-button-icon-lg {width:32px;height:32px;padding:0}
.ui-buttonc > .ui-buttonc__label > svg:only-child {display:block;width:var(--icon);height:var(--icon)}
`;
