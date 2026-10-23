'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  applyAppearance,
  appearanceTokens,
  customTokens,
  defaultAppearance,
  palettes,
  parseAppearance,
  saveAppearance,
  type Appearance,
} from '@/lib/appearance';
import { Button } from './ui/button';
import styles from './theme-settings.module.css';

const paletteLabels: Record<Appearance['palette'], string> = {
  'oc-2': 'OpenCode OC-2',
  datumm: 'DATUMM classic',
  opencode: 'OpenCode TUI (legacy)',
  nord: 'Nord',
  tokyonight: 'Tokyo Night',
  'one-dark': 'One Dark',
  catppuccin: 'Catppuccin',
};

const paletteKeys = ['oc-2', ...Object.keys(palettes).filter((name) => name !== 'oc-2')] as Appearance['palette'][];

const modeLabels: Record<Appearance['mode'], string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

const modeDescriptions: Record<Appearance['mode'], string> = {
  system: 'Follow this device',
  light: 'Use a light appearance',
  dark: 'Use a dark appearance',
};

function MiniApp({ tokens }: { tokens: Record<string, string> }) {
  return (
    <span
      className={styles.miniApp}
      style={{ backgroundColor: tokens.background, color: tokens.foreground, borderColor: tokens.border }}
    >
      <span className={styles.miniSidebar} style={{ backgroundColor: tokens.card, borderColor: tokens.border }}>
        <span className={styles.miniBrand} style={{ backgroundColor: tokens['trace-accent'] }} />
        <span className={styles.miniNav} style={{ backgroundColor: tokens['muted-foreground'] }} />
        <span className={styles.miniNavShort} style={{ backgroundColor: tokens['muted-foreground'] }} />
      </span>
      <span className={styles.miniScreen}>
        <span className={styles.miniToolbar} style={{ backgroundColor: tokens.secondary }} />
        <span className={styles.miniTitle} style={{ backgroundColor: tokens.foreground }} />
        <span className={styles.miniPanel} style={{ backgroundColor: tokens.card, borderColor: tokens.border }}>
          <span className={styles.miniText} style={{ backgroundColor: tokens['muted-foreground'] }} />
          <span className={styles.miniTextShort} style={{ backgroundColor: tokens['muted-foreground'] }} />
          <span className={styles.miniAccent} style={{ backgroundColor: tokens['trace-accent'] }} />
        </span>
      </span>
    </span>
  );
}

export function ThemeSettings({ motionRow, advancedControl }: { motionRow: ReactNode; advancedControl: ReactNode }) {
  const [density, setDensity] = useState('comfortable');
  const [scale, setScale] = useState('100');
  const [saved, setSaved] = useState<Appearance>(defaultAppearance);
  const [draft, setDraft] = useState<Appearance>(defaultAppearance);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const draftRef = useRef<Appearance>(defaultAppearance);

  const layout = (name: 'density' | 'scale', value: string) => {
    document.documentElement.dataset[name] = value;
    localStorage.setItem('datumm-' + name, value);
    if (name === 'density') setDensity(value);
    else setScale(value);
  };

  useEffect(() => {
    setDensity(localStorage.getItem('datumm-density') ?? 'comfortable');
    setScale(localStorage.getItem('datumm-scale') ?? '100');
    try {
      const value = parseAppearance(JSON.parse(localStorage.getItem('datumm-appearance') ?? JSON.stringify(defaultAppearance)));
      draftRef.current = value;
      setSaved(value);
      setDraft(value);
    } catch {}
  }, []);

  const preview = (value: Appearance) => {
    draftRef.current = value;
    setDraft(value);
    setError('');
    setNotice('');
    try {
      applyAppearance(parseAppearance(value));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(
    () => () => {
      try {
        applyAppearance(parseAppearance(JSON.parse(localStorage.getItem('datumm-appearance') ?? JSON.stringify(defaultAppearance))));
      } catch {
        applyAppearance(defaultAppearance);
      }
    },
    [],
  );

  useEffect(() => {
    const system = matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      try {
        applyAppearance(parseAppearance(draftRef.current));
      } catch {
        applyAppearance(defaultAppearance);
      }
    };
    system.addEventListener('change', update);
    window.addEventListener('datumm-contrast-changed', update);
    return () => {
      system.removeEventListener('change', update);
      window.removeEventListener('datumm-contrast-changed', update);
    };
  }, []);

  const dark = draft.mode === 'dark' || (draft.mode === 'system' && (typeof window === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches));
  const variant = dark ? 'dark' : 'light';
  const tokens = appearanceTokens({ ...draft, custom: undefined }, dark);
  const accent = appearanceTokens(draft, dark)['trace-accent'];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <div className={`theme-settings ${styles.settings}`}>
      <header className={styles.intro}>
        <h3>Appearance</h3>
        <p>Quiet chrome. Clear drawings. A workspace that stays out of your way.</p>
      </header>

      <div className={styles.rows}>
        <div className={styles.row}>
          <div className={styles.rowCopy}>
            <strong>Theme</strong>
            <small>The drawing sheet keeps its neutral paper background.</small>
          </div>
          <select
            className={styles.rowSelect}
            aria-label="Color theme"
            value={draft.mode}
            onChange={(event) => preview({ ...draft, mode: event.target.value as Appearance['mode'] })}
          >
            {(['system', 'light', 'dark'] as const).map((mode) => <option key={mode} value={mode}>{modeLabels[mode]}</option>)}
          </select>
        </div>
        <div className={styles.row}>
          <div className={styles.rowCopy}>
            <strong>Interface density</strong>
            <small>Choose space around controls and lists.</small>
          </div>
          <select className={styles.rowSelect} aria-label="Interface density" value={density} onChange={(event) => layout('density', event.target.value)}>
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </div>
        <div className={styles.row}>
          <div className={styles.rowCopy}>
            <strong>Accent color</strong>
            <small>Selection, comments and active work share one accent.</small>
          </div>
          <span className={styles.accentSwatch} role="img" aria-label={`Accent color ${accent}`} style={{ backgroundColor: accent }} />
        </div>
        {motionRow}
      </div>

      <details className={styles.browse}>
        <summary>Browse palettes</summary>
        <div className={styles.browseContent}>
          <label className={styles.row}>
            <span>Color palette</span>
            <select className={styles.rowSelect} aria-label="Color palette" value={draft.palette} onChange={event => preview({ ...draft, palette: event.target.value as Appearance['palette'] })}>
              {paletteKeys.map(palette => <option key={palette} value={palette}>{paletteLabels[palette]}</option>)}
            </select>
          </label>
          <section className={styles.section} aria-labelledby="appearance-mode-heading">
            <div className={styles.sectionHeading}>
              <div>
                <h3 id="appearance-mode-heading">Color mode</h3>
                <p>Choose how DATUMM adapts to your display.</p>
              </div>
            </div>
            <div className={styles.modeGrid} role="group" aria-label="Color mode">
              {(['light', 'system', 'dark'] as const).map((mode) => {
                const previewModes = mode === 'system' ? (['light', 'dark'] as const) : ([mode] as const);
                return (
                  <button
                    key={mode}
                    type="button"
                    className={styles.modeCard}
                    aria-label={modeLabels[mode]}
                    data-mode={mode}
                    aria-pressed={draft.mode === mode}
                    onClick={() => preview({ ...draft, mode })}
                  >
                    <span className={styles.modePreviews} aria-hidden="true">
                      {previewModes.map((previewMode) => (
                        <MiniApp key={previewMode} tokens={appearanceTokens(draft, previewMode === 'dark')} />
                      ))}
                    </span>
                    <span className={styles.modeText}>
                      <span className={styles.modeLabel}>{modeLabels[mode]}</span>
                      <span className={styles.modeDescription}>{modeDescriptions[mode]}</span>
                    </span>
                    <span className={styles.selectionMark} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="appearance-palette-heading">
            <div className={styles.sectionHeading}>
              <div>
                <h3 id="appearance-palette-heading">Color palette</h3>
                <p>Pick a palette for your workspace.</p>
              </div>
              <span className={styles.paletteCount}>{paletteKeys.length} palettes</span>
            </div>
            <div className={styles.paletteGrid} role="group" aria-label="Color palette">
              {paletteKeys.map((palette) => {
                const paletteTokens = appearanceTokens({ ...draft, palette, custom: undefined }, dark);
                return (
                  <button
                    key={palette}
                    type="button"
                    className={styles.paletteCard}
                    aria-label={paletteLabels[palette]}
                    data-palette={palette}
                    aria-pressed={draft.palette === palette}
                    onClick={() => preview({ ...draft, palette })}
                  >
                    <MiniApp tokens={paletteTokens} />
                    <span className={styles.paletteSwatches} aria-hidden="true">
                      {[paletteTokens.background, paletteTokens.card, paletteTokens.secondary, paletteTokens['trace-accent']].map((color, index) => (
                        <span key={index} style={{ backgroundColor: color }} />
                      ))}
                    </span>
                    <span className={styles.paletteFooter}>
                      <span className={styles.paletteName}>{paletteLabels[palette]}</span>
                      <span className={styles.selectionMark} aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </details>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={() => preview(defaultAppearance)}>Reset to DATUMM</Button>
        <Button variant="outline" size="sm" onClick={() => preview(saved)}>Cancel preview</Button>
        <Button size="sm" disabled={!dirty || Boolean(error)} onClick={() => {
          try {
            saveAppearance(draft);
            setSaved(draft);
            setNotice('Appearance applied and saved.');
          } catch (e) {
            setError((e as Error).message);
          }
        }}>Apply appearance</Button>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <details className={styles.advanced}>
        <summary>
          <span>Advanced</span>
          <span>Text size, contrast, custom colors and theme files</span>
        </summary>
        <div className={styles.advancedContent}>
          <div className={styles.rows}>
            {advancedControl}
            <div className={styles.row}>
              <div className={styles.rowCopy}>
                <strong>Reading text size</strong>
                <small>Adjust text throughout the workspace.</small>
              </div>
              <select className={styles.rowSelect} aria-label="Reading text size" value={scale} onChange={(event) => layout('scale', event.target.value)}>
                <option value="100">Default</option>
                <option value="115">Larger</option>
                <option value="130">Largest</option>
              </select>
            </div>
          </div>
          <div className={styles.advancedHeading}>
            <h3>Custom colors · {variant}</h3>
            <p>Adjust the active light or dark palette. Imported themes only change supported color tokens.</p>
          </div>
          <div className={styles.customColors}>
            {customTokens.map((name) => (
              <label key={name}>
                <span>{name.replaceAll('-', ' ')}</span>
                <input
                  type="color"
                  aria-label={`Theme ${name}`}
                  value={draft.custom?.[variant]?.[name] ?? tokens[name]}
                  onChange={(event) => preview({
                    ...draft,
                    custom: { ...draft.custom, [variant]: { ...draft.custom?.[variant], [name]: event.target.value } },
                  })}
                />
              </label>
            ))}
          </div>
          <div className={styles.themeFiles}>
            <label className="settings-field">
              Import DATUMM theme JSON
              <input
                type="file"
                accept=".json"
                aria-label="Import theme"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  try {
                    if (file.size > 8192) throw Error('Theme file must be at most 8 KiB.');
                    preview(parseAppearance(JSON.parse(await file.text())));
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </label>
            <a
              className={styles.themeExport}
              download="datumm-theme.json"
              href={'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(draft, null, 2))}
            >
              Export theme JSON
            </a>
          </div>
        </div>
      </details>

      <p className={styles.note}>
        Includes OpenCode OC-2 and legacy TUI palettes adapted for this workspace. Text contrast is adjusted for readability; drawings keep their source colors. Preview is temporary until saved.
      </p>
    </div>
  );
}
