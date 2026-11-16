import affectui from './themes/affectui.json';

export type Appearance = { version: 2; palette: 'affectui'; mode: 'system' | 'light' | 'dark' };
type AppearanceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const defaultAppearance: Appearance = { version: 2, palette: 'affectui', mode: 'dark' };
export const appearanceStorageKey = 'datumm-appearance';
export const appearanceBackupKey = 'datumm-appearance:before-affectui-v2';

// Keep this factory self-contained: its exact runtime implementation also runs before hydration.
function createAppearancePersistence(fallback: Appearance, key: string, backupKey: string) {
  const validMode = (mode: unknown): mode is Appearance['mode'] => mode === 'system' || mode === 'light' || mode === 'dark';
  function parse(value: unknown): Appearance {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Choose a valid DATUMM appearance.');
    const input = value as Record<string, unknown>;
    if (input.version !== 2 || input.palette !== 'affectui' || !validMode(input.mode) ||
      Object.keys(input).length !== 3 || !['version', 'palette', 'mode'].every(name => Object.hasOwn(input, name))) {
      throw Error('Choose Light, Dark or System using the DATUMM appearance.');
    }
    return { version: 2, palette: 'affectui', mode: input.mode };
  }
  function storageOrBrowser(storage?: AppearanceStorage): AppearanceStorage {
    return storage ?? window.localStorage;
  }
  function backup(storage: AppearanceStorage, raw: string) {
    if (new TextEncoder().encode(raw).byteLength > 16 * 1024) throw Error('The previous appearance is too large to back up. Download it before replacing it.');
    if (storage.getItem(backupKey) === null) storage.setItem(backupKey, raw);
  }
  function write(value: Appearance, storage?: AppearanceStorage) {
    const preference = parse(value);
    const target = storageOrBrowser(storage);
    const raw = target.getItem(key);
    if (raw !== null) {
      let current = false;
      try { parse(JSON.parse(raw)); current = true; } catch {}
      if (!current) backup(target, raw);
    }
    target.setItem(key, JSON.stringify(preference));
    return preference;
  }
  function read(storage?: AppearanceStorage): Appearance {
    try {
      const target = storageOrBrowser(storage);
      const raw = target.getItem(key);
      if (raw === null) return { ...fallback };
      const value: unknown = JSON.parse(raw);
      try { return parse(value); } catch {}
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.hasOwn(value, 'version')) return { ...fallback };
      const mode = (value as Record<string, unknown>).mode;
      if (!validMode(mode)) return { ...fallback };
      const preference: Appearance = { version: 2, palette: 'affectui', mode };
      // A denied backup/write must not discard a readable Light or System choice.
      try { backup(target, raw); target.setItem(key, JSON.stringify(preference)); } catch {}
      return preference;
    } catch { return { ...fallback }; }
  }
  return { parse, read, write };
}

const persistence = createAppearancePersistence(defaultAppearance, appearanceStorageKey, appearanceBackupKey);
export function parseAppearance(value: unknown): Appearance { return persistence.parse(value); }
export function readAppearance(storage?: AppearanceStorage): Appearance { return persistence.read(storage); }

export function appearanceTokens(_preference: Appearance, dark: boolean): Record<string, string> {
  const roles = affectui[dark ? 'dark' : 'light'];
  return {
    ...roles,
    background: roles.page, foreground: roles.ink, card: roles.panel, secondary: roles.tray,
    border: roles.line, 'muted-foreground': roles.text, chrome: roles.panel, separator: roles.line,
    'primary-foreground': roles['primary-fg'], 'trace-accent': roles.accent,
    'trace-thought': roles.warning, 'trace-error': roles.danger, 'trace-success': roles.success,
    'aui-surface': 'var(--panel)', 'aui-overlay': 'var(--panel)', 'aui-ink': 'var(--ink)',
    'aui-text': 'var(--text)', 'aui-muted': 'var(--muted)', 'aui-placeholder': 'var(--faint)',
    'aui-border': 'var(--line)', 'aui-border-strong': 'var(--line-strong)', 'aui-subtle': 'var(--chip)',
    'aui-primary': 'var(--primary)', 'aui-on-primary': 'var(--primary-fg)',
    'aui-blue': 'var(--accent)', 'aui-info': 'var(--accent)', 'aui-cyan': 'var(--accent)',
    'aui-info-soft': 'color-mix(in srgb, var(--accent) 12%, transparent)',
    'aui-focus': 'var(--ui-as-focus)', 'aui-success': 'var(--success)', 'aui-green': 'var(--success)',
    'aui-warning': 'var(--warning)', 'aui-amber': 'var(--warning)', 'aui-orange': 'var(--warning)',
    'aui-danger': 'var(--danger)', 'aui-red': 'var(--danger)', 'aui-purple': 'var(--purple)',
    'aui-success-soft': 'var(--success-soft)', 'aui-warning-soft': 'var(--warning-soft)', 'aui-danger-soft': 'var(--danger-soft)',
    'aui-shadow-ink': 'var(--shadow-ink)',
    'aui-font': '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
    'aui-font-mono': 'SFMono-Regular, Consolas, "Liberation Mono", monospace',
    'aui-radius': '6px', 'aui-radius-sm': '4px', 'aui-radius-lg': '10px', 'aui-ease': 'cubic-bezier(.22,1,.36,1)',
  };
}

// Self-contained so bootstrap and runtime apply exactly the same trusted roles and contrast policy.
function applyTokens(tokens: Record<string, string>, dark: boolean, highContrast: boolean) {
  const root = document.documentElement;
  if (highContrast) {
    const ink = dark ? '#ffffff' : '#000000';
    tokens.ink = tokens.text = tokens.muted = tokens.foreground = tokens['muted-foreground'] = ink;
    tokens.line = tokens['line-strong'] = tokens.border = tokens.separator = dark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
  }
  for (const [key, value] of Object.entries(tokens)) root.style.setProperty('--' + key, value);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.classList.toggle('dark', dark);
}

export function applyAppearance(preference: Appearance) {
  const dark = preference.mode === 'dark' || preference.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches;
  applyTokens(appearanceTokens(preference, dark), dark, document.documentElement.dataset.contrast === 'high');
}

const bootstrapThemes = JSON.stringify({ dark: appearanceTokens(defaultAppearance, true), light: appearanceTokens(defaultAppearance, false) });
export const appearanceBootstrap = `try {
  var persistence = (${createAppearancePersistence.toString()})(${JSON.stringify(defaultAppearance)}, ${JSON.stringify(appearanceStorageKey)}, ${JSON.stringify(appearanceBackupKey)});
  var preference = persistence.read();
  var themes = ${bootstrapThemes};
  var dark = preference.mode === 'dark' || preference.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches;
  var highContrast = false;
  var motion = 'full';
  try { highContrast = localStorage.getItem('datumm-contrast') === 'high'; } catch (e) {}
  try { motion = localStorage.getItem('datumm-motion') === 'reduce' ? 'reduce' : 'full'; } catch (e) {}
  document.documentElement.dataset.contrast = highContrast ? 'high' : 'normal';
  document.documentElement.dataset.motion = motion;
  (${applyTokens.toString()})(Object.assign({}, themes[dark ? 'dark' : 'light']), dark, highContrast);
} catch (e) {}`;

export function saveAppearance(preference: Appearance) {
  const value = persistence.write(preference);
  applyAppearance(value);
}
