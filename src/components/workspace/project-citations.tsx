'use client';

import {useId, useState} from 'react';
import {FileText} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {SourceCitation} from '@/lib/project-sources.mjs';
import {ProjectSourcePreview} from './project-source-preview';
import styles from './project-files.module.css';

export function ProjectCitationList({citations}: {citations:SourceCitation[]}) {
  const id = useId();
  const [selection,setSelection] = useState<string>();
  return <section className={styles.citations} aria-label="Project sources">
    <strong>Sources</strong>
    {citations.map((source,index) => {
      const where = source.locator.kind === 'page' ? 'page ' + source.locator.page :
        source.locator.kind === 'text' ? 'line ' + source.locator.line : '';
      const key = JSON.stringify([source.sourceId,source.version,source.sha256,source.locator]);
      const shown = selection === key;
      return <div key={key}>
        <Button className={styles.citation} size="sm" variant="ghost" type="button" aria-expanded={shown}
          aria-controls={id + '-' + index} onClick={() => setSelection(shown ? undefined : key)}>
          <FileText aria-hidden="true" /><bdi>{source.filename}</bdi><span>Revision {source.version}{where && ' · ' + where}</span>
        </Button>
        <div id={id + '-' + index} hidden={!shown}>
          {shown && <ProjectSourcePreview reference={source} locator={source.locator}/>}
        </div>
      </div>;
    })}
  </section>;
}
