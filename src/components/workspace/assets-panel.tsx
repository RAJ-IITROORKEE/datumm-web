'use client';

import { useState } from 'react';
import { ArrowUpRight, Download, File, FileSpreadsheet, FileText, GitBranch, Image, Search } from 'lucide-react';
import type { AssetRow, AssetsPanelProps } from '@/lib/work-area-contract';
import styles from './assets-panel.module.css';

const typeLabels: Record<AssetRow['kind'], string> = { 'saved-drawing': 'Drawing', 'answer-output': 'Answer output', 'saved-report': 'Saved report', 'saved-attachment': 'Attachment', 'specialist-artifact': 'Specialist artifact', 'draft-attachment': 'Draft attachment' };
const icons = { 'saved-drawing': Image, 'answer-output': FileText, 'saved-report': FileSpreadsheet, 'saved-attachment': File, 'specialist-artifact': GitBranch, 'draft-attachment': File };
function details(row: AssetRow) {
  return [row.metadata.mime, row.metadata.bytes == null ? null : `${row.metadata.bytes.toLocaleString()} bytes`, row.metadata.page == null ? null : `Page ${row.metadata.page}`].filter(Boolean).join(' · ');
}
function technicalDetails(row: AssetRow) {
  return [
    ['Plan ID', row.metadata.planId], ['Version', row.metadata.version], ['Fingerprint', row.metadata.fingerprint],
    ['Attachment ID', row.metadata.attachmentId], ['Artifact reference', row.metadata.artifactRef],
    ['SHA-256', row.metadata.sha256],
  ].filter((entry): entry is [string, string | number] => entry[1] != null);
}

export function AssetsPanel({ rows, onActivate, onSelectAlternative, selectionBusy }: AssetsPanelProps) {
  const [query, setQuery] = useState('');
  const visible = rows.filter(row => `${row.title} ${row.provenance} ${row.metadata.mime ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  return <section className={styles.panel} aria-label="Workspace assets">
    <header className={styles.header}><h2>Assets</h2><p>Open a drawing, report or answer from this workspace.</p></header>
    <label className={styles.search}><Search size={14} aria-hidden="true"/><span className="sr-only">Search workspace assets</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search assets"/></label>
    <p className={styles.caption}>{visible.length} {visible.length === 1 ? 'asset' : 'assets'}</p>
    {visible.length ? <ul className={styles.list}>{visible.map(row => {
      const Icon = icons[row.kind], unavailable = row.destination.kind === 'unavailable';
      return <li key={row.id} className={styles.row}>
        <button type="button" className={styles.open} aria-disabled={unavailable} onClick={event => onActivate(row, event.currentTarget)}>
          <Icon size={17} aria-hidden="true"/><span className={styles.description}><strong>{row.title}</strong><span>{typeLabels[row.kind]} · {row.provenance}{row.kind === 'draft-attachment' && ' · Unsaved'}</span>{details(row) && <span>{details(row)}</span>}{unavailable && <span>{row.destination.kind === 'unavailable' && row.destination.reason}</span>}</span>{!unavailable && <span className={styles.action}>{row.destination.kind === 'specialist-download' ? <>Download <Download size={15} aria-hidden="true"/></> : <>Preview <ArrowUpRight size={15} aria-hidden="true"/></>}</span>}
        </button>
        {row.alternativeSelection && <button type="button" className={styles.select} disabled={selectionBusy} title="Changes the selected task alternative. Plan acceptance and native approval remain separate." onClick={() => void onSelectAlternative(row.alternativeSelection!)}>Review/select alternative</button>}
        {technicalDetails(row).length > 0 && <details className={styles.technical}>
          <summary>Source details</summary>
          <dl>{technicalDetails(row).map(([label, value]) => <div key={label}><dt>{label}</dt><dd><code>{value}</code></dd></div>)}</dl>
        </details>}
      </li>;
    })}</ul> : <div className={styles.empty}><File size={24} aria-hidden="true"/><h3>{rows.length ? 'No matching assets' : 'No loaded assets yet'}</h3><p>{rows.length ? 'Try another name or file type.' : 'Saved task drawings, answer outputs and attachment references appear here when available.'}</p></div>}
    <p className={styles.note}>Only loaded workspace data is listed. Availability is shown for each item.</p>
  </section>;
}
