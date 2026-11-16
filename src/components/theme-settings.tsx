'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  applyAppearance,
  appearanceBackupKey,
  appearanceTokens,
  defaultAppearance,
  parseAppearance,
  readAppearance,
  saveAppearance,
  type Appearance,
} from '@/lib/appearance';
import { Button } from './ui/button';
import styles from './theme-settings.module.css';

function readBackup() {
  try { return localStorage.getItem(appearanceBackupKey); } catch { return null; }
}

export function ThemeSettings({ motionRow, advancedControl }: { motionRow: ReactNode; advancedControl: ReactNode }) {
  const [density, setDensity] = useState('comfortable');
  const [scale, setScale] = useState('100');
  const [contrast, setContrast] = useState('normal');
  const [motion, setMotion] = useState('full');
  const [saved, setSaved] = useState<Appearance>(defaultAppearance);
  const [draft, setDraft] = useState<Appearance>(defaultAppearance);
  const [backup, setBackup] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const draftRef = useRef<Appearance>(defaultAppearance);

  const layout = (name: 'density' | 'scale' | 'contrast' | 'motion', value: string) => {
    document.documentElement.dataset[name] = value;
    if (name === 'density') setDensity(value);
    if (name === 'scale') setScale(value);
    if (name === 'motion') setMotion(value);
    if (name === 'contrast') {
      setContrast(value);
      applyAppearance(draftRef.current);
      window.dispatchEvent(new Event('datumm-contrast-changed'));
    }
    try { localStorage.setItem('datumm-' + name, value); }
    catch { setError('The preference changed for this visit but could not be saved. Allow browser storage and try again.'); }
  };

  useEffect(() => {
    try {
      setDensity(localStorage.getItem('datumm-density') ?? 'comfortable');
      setScale(localStorage.getItem('datumm-scale') ?? '100');
      setContrast(localStorage.getItem('datumm-contrast') === 'high' ? 'high' : 'normal');
      setMotion(localStorage.getItem('datumm-motion') === 'reduce' ? 'reduce' : 'full');
    } catch {}
    const value = readAppearance();
    draftRef.current = value;
    setSaved(value);
    setDraft(value);
    setBackup(readBackup());
  }, []);

  const preview = (value: Appearance) => {
    draftRef.current = value;
    setDraft(value);
    setError('');
    setNotice('');
    try { applyAppearance(parseAppearance(value)); }
    catch (failure) { setError((failure as Error).message); }
  };

  useEffect(() => () => applyAppearance(readAppearance()), []);

  useEffect(() => {
    const system = matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyAppearance(draftRef.current);
    system.addEventListener('change', update);
    window.addEventListener('datumm-contrast-changed', update);
    return () => {
      system.removeEventListener('change', update);
      window.removeEventListener('datumm-contrast-changed', update);
    };
  }, []);

  const dark = draft.mode === 'dark' || (draft.mode === 'system' && (typeof window === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches));
  const accent = appearanceTokens(draft, dark).accent;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <div className={`theme-settings ${styles.settings}`}>
      <header className={styles.intro}>
        <h3>Appearance</h3>
        <p>Choose how DATUMM adapts to your display.</p>
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
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
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
        {motionRow ?? <div className={styles.row}>
          <div className={styles.rowCopy}>
            <strong>Motion</strong>
            <small>Reduce interface animations.</small>
          </div>
          <select className={styles.rowSelect} aria-label="Motion preference" value={motion} onChange={event => layout('motion', event.target.value)}>
            <option value="full">Full motion</option>
            <option value="reduce">Reduced motion</option>
          </select>
        </div>}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={() => preview(defaultAppearance)}>Reset to DATUMM</Button>
        <Button variant="outline" size="sm" onClick={() => {
          const value = readAppearance();
          setSaved(value);
          preview(value);
        }}>Cancel preview</Button>
        <Button size="sm" disabled={!dirty} onClick={() => {
          try {
            saveAppearance(draft);
            setSaved(draft);
            setBackup(readBackup());
            setError('');
            setNotice('Appearance applied and saved.');
          } catch (failure) {
            setError(`Appearance could not be saved. Your preview is still active. ${(failure as Error).message}`);
          }
        }}>Apply appearance</Button>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <details className={styles.advanced}>
        <summary>
          <span>Advanced</span>
          <span>Text size and contrast</span>
        </summary>
        <div className={styles.advancedContent}>
          <div className={styles.rows}>
            {advancedControl ?? <div className={styles.row}>
              <div className={styles.rowCopy}>
                <strong>Contrast</strong>
                <small>Increase text and separator contrast.</small>
              </div>
              <select className={styles.rowSelect} aria-label="Contrast preference" value={contrast} onChange={event => layout('contrast', event.target.value)}>
                <option value="normal">Standard</option>
                <option value="high">High</option>
              </select>
            </div>}
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
          {backup !== null && <div className={styles.previousAppearance}>
            <p>Your previous appearance was retained when DATUMM updated its visual system.</p>
            <a className={styles.themeExport} download="datumm-appearance-before-affectui-v2.json"
              href={'data:application/json;charset=utf-8,' + encodeURIComponent(backup)}>Download previous appearance JSON</a>
          </div>}
        </div>
      </details>

      <p className={styles.note}>Preview is temporary until saved. Drawings keep their source colors.</p>
    </div>
  );
}
