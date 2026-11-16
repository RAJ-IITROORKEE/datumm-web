'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ChipList, ConfigPage, Field, ItemCard, SettingsGroup } from './form';
import styles from './admin-form.module.css';
import { LIMIT_KEYS, MODES, normalizeDomain, type AdminMcp, type AdminSkill } from '@/lib/admin-config.mjs';

const num = (v: string) => (v === '' ? 0 : Number(v));
const effectiveText = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v ?? ''));

export function AgentSection() {
  return (
    <ConfigPage title="Agent" description="Models, budgets and concurrency applied to new runs. Runs snapshot these at creation, so edits never change a run in progress.">
      {({ draft, update, errors, effective }) => (
        <>
          <SettingsGroup title="Models" description={`Models users may pick. Empty uses the server default list (${effectiveText(effective.models) || 'unknown'}).`}>
            <ChipList draftKey="models" label="Allowed models" values={draft.models} onChange={models => update({ models })} max={20} placeholder="provider/model-name" error={errors.models || Object.entries(errors).find(([key]) => key.startsWith('models.'))?.[1]}/>
              <Field layout="row" label="Default model" error={errors.defaultModel} hint={`Effective: ${effectiveText(effective.defaultModel)}`}>
                {p => <Select {...p} value={draft.defaultModel} onChange={e => update({ defaultModel: e.target.value })}><option value="">Server default</option>{draft.models.map(m => <option key={m}>{m}</option>)}</Select>}
              </Field>
              <Field layout="row" label="Reasoning effort" error={errors.defaultReasoningEffort} hint={`Effective: ${effectiveText(effective.defaultReasoningEffort)}`}>
                {p => <Select {...p} value={draft.defaultReasoningEffort} onChange={e => update({ defaultReasoningEffort: e.target.value as typeof draft.defaultReasoningEffort })}><option value="">Server default</option><option>low</option><option>medium</option><option>high</option></Select>}
              </Field>
          </SettingsGroup>
          <SettingsGroup title="Budget and concurrency" description="The run budget and parallel chats allowed for each owner.">
              <Field layout="row" label="Run USD limit" error={errors.runUsdLimit} hint={`USD per run, up to 10. 0 uses the server default. Effective: ${effectiveText(effective.runUsdLimit)}`}>
                {p => <Input {...p} type="number" inputMode="decimal" min={0} max={10} step={0.01} value={draft.runUsdLimit} onChange={e => update({ runUsdLimit: num(e.target.value) })} />}
              </Field>
              <Field layout="row" label="Parallel chats" error={errors.parallelChats} hint="1 to 5 chats running at once per owner.">
                {p => <Input {...p} type="number" inputMode="numeric" min={1} max={5} step={1} value={draft.parallelChats} onChange={e => update({ parallelChats: num(e.target.value) })} />}
              </Field>
          </SettingsGroup>
          <SettingsGroup title="Per-run limits" description="Whole numbers from 0 to 100. Leave empty for the server default.">
              {LIMIT_KEYS.map(k => (
                <Field layout="row" key={k} label={k.replaceAll('_', ' ')} error={errors[`limits.${k}`]} hint={k in draft.limits ? undefined : `Effective: ${effectiveText((effective.limits as Record<string, unknown> | undefined)?.[k]) || 'default'}`}>
                  {p => <Input {...p} type="number" inputMode="numeric" min={0} max={100} step={1} value={draft.limits[k] ?? ''} onChange={e => { const { [k]: _, ...rest } = draft.limits; update({ limits: e.target.value === '' ? rest : { ...rest, [k]: num(e.target.value) } }); }} />}
                </Field>
              ))}
          </SettingsGroup>
        </>
      )}
    </ConfigPage>
  );
}

export function WebSearchSection() {
  return (
    <ConfigPage title="Web search" description="Controls the agent's general web_search tool. Knowledge sources are searched first; the web is used when nothing scores high enough.">
      {({ draft, update, errors }) => {
        const ws = draft.webSearch, set = (p: Partial<typeof ws>) => update({ webSearch: { ...ws, ...p } });
        return (
          <SettingsGroup title="Search preferences" description="Choose when the general web search tool is available and where it searches.">
            <div className={styles.toggleRow}>
              <div><label htmlFor="ws-enabled">Web search enabled</label><p>Turn off to stop all web lookups.</p></div>
              <Switch id="ws-enabled" checked={ws.enabled} onCheckedChange={enabled => set({ enabled })} />
            </div>
            <ChipList draftKey="domains" label="Preferred domains" values={ws.includeDomains} onChange={includeDomains => set({ includeDomains })} max={30} normalize={normalizeDomain} placeholder="example.org" error={errors['webSearch.includeDomains']} hint="Results are limited to these domains. Empty allows any." />
            <Field layout="row" label="Max results" error={errors['webSearch.maxResults']} hint="1 to 10 per search.">
              {p => <Input {...p} type="number" inputMode="numeric" min={1} max={10} step={1} value={ws.maxResults} onChange={e => set({ maxResults: num(e.target.value) })} />}
            </Field>
          </SettingsGroup>
        );
      }}
    </ConfigPage>
  );
}

const newSkill = (): AdminSkill => ({ id: '', name: '', description: '', instructions: '', modes: ['ask', 'plan'], enabled: true });

export function SkillsSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ConfigPage title="Skills" description="Extra instructions appended to the agent's system prompt for the selected modes while the skill is enabled.">
      {({ draft, update, errors }) => {
        const patch = (i: number, p: Partial<AdminSkill>) => update({ skills: draft.skills.map((s, j) => (j === i ? { ...s, ...p } : s)) });
        return (
          <>
            <div className={styles.directory}>
            {!draft.skills.length && <div className={styles.empty}><h2>No custom skills</h2><p>Add instructions for the agent to follow in selected modes. Changes apply after you save.</p></div>}
            {draft.skills.map((s, i) => {
              const e = (k: string) => errors[`skills.${i}.${k}`];
              return (
                <ItemCard key={i} title={s.name || s.id || 'New skill'} subtitle={s.id || 'no id yet'} invalid={Object.keys(errors).some(key => key.startsWith(`skills.${i}.`))} open={open === i} onToggle={() => setOpen(open === i ? null : i)}
                  onRemove={() => { update({ skills: draft.skills.filter((_, j) => j !== i) }); setOpen(null); }}
                  badges={<>{s.modes.map(m => <Badge key={m} variant="outline">{m}</Badge>)}<Badge variant={s.enabled ? 'default' : 'secondary'}>{s.enabled ? 'on' : 'off'}</Badge></>}>
                  <div className={styles.pair}>
                    <Field label="Id" error={e('id')} hint="Lowercase letters, digits, dashes.">{p => <Input {...p} value={s.id} maxLength={40} onChange={ev => patch(i, { id: ev.target.value })} />}</Field>
                    <Field label="Name" error={e('name')}>{p => <Input {...p} value={s.name} maxLength={120} onChange={ev => patch(i, { name: ev.target.value })} />}</Field>
                  </div>
                  <Field label="Description" error={e('description')} hint={`${s.description.length} of 300`}>{p => <Input {...p} value={s.description} maxLength={300} onChange={ev => patch(i, { description: ev.target.value })} />}</Field>
                  <Field label="Instructions" error={e('instructions')} hint={`${s.instructions.length} of 4000`}>{p => <Textarea {...p} rows={8} value={s.instructions} maxLength={4000} onChange={ev => patch(i, { instructions: ev.target.value })} />}</Field>
                  <fieldset className={styles.modeGroup} aria-invalid={Boolean(e('modes'))} aria-describedby={e('modes') ? `skill-${i}-modes-err` : undefined}>
                    <legend>Modes</legend>
                    <div className={styles.modeOptions}>
                      {MODES.map(m => (
                        <label key={m}><input type="checkbox" checked={s.modes.includes(m)} onChange={ev => patch(i, { modes: ev.target.checked ? [...s.modes, m] : s.modes.filter(x => x !== m) })} />{m}</label>
                      ))}
                    </div>
                    {e('modes') && <p id={`skill-${i}-modes-err`} className="mt-1 text-xs text-destructive">{e('modes')}</p>}
                  </fieldset>
                  <div className={styles.toggleRow}><div><label htmlFor={`skill-${i}-on`}>Enable skill</label><p>Append these instructions in the selected modes.</p></div><Switch id={`skill-${i}-on`} checked={s.enabled} onCheckedChange={enabled => patch(i, { enabled })} /></div>
                </ItemCard>
              );
            })}
            {errors.skills && <p className="text-xs text-destructive">{errors.skills}</p>}
            <div className={styles.directoryActions}><Button type="button" variant="outline" disabled={draft.skills.length >= 30} onClick={() => { update({ skills: [...draft.skills, newSkill()] }); setOpen(draft.skills.length); }}><Plus aria-hidden /> Add skill</Button><p>{draft.skills.length} of 30 skills</p></div></div>
          </>
        );
      }}
    </ConfigPage>
  );
}

const newMcp = (): AdminMcp => ({ id: '', name: '', url: 'https://', enabled: false, toolAllowlist: [] });

export function McpSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ConfigPage title="MCP servers" description="Remote MCP servers you plan to offer to the agent.">
      {({ draft, update, errors }) => {
        const patch = (i: number, p: Partial<AdminMcp>) => update({ mcpServers: draft.mcpServers.map((s, j) => (j === i ? { ...s, ...p } : s)) });
        return (
          <>
            <div role="note" className={styles.notice}><div className={styles.noticeCopy}><strong>Stored configuration only</strong><p>Saving records these servers. They are not connected to the agent, and their tools are not available to runs.</p></div></div>
            <div className={styles.directory}>
            {!draft.mcpServers.length && <div className={styles.empty}><h2>No MCP servers configured</h2><p>Add a remote server to store its URL and allowed tool names.</p></div>}
            {draft.mcpServers.map((s, i) => {
              const e = (k: string) => errors[`mcpServers.${i}.${k}`];
              return (
                <ItemCard key={i} title={s.name || s.id || 'New server'} subtitle={s.url} invalid={Object.keys(errors).some(key => key.startsWith(`mcpServers.${i}.`))} open={open === i} onToggle={() => setOpen(open === i ? null : i)}
                  onRemove={() => { update({ mcpServers: draft.mcpServers.filter((_, j) => j !== i) }); setOpen(null); }}
                  badges={<Badge variant={s.enabled ? 'default' : 'secondary'}>{s.enabled ? 'enabled' : 'disabled'}</Badge>}>
                  <div className={styles.pair}>
                    <Field label="Id" error={e('id')} hint="Lowercase letters, digits, dashes.">{p => <Input {...p} value={s.id} maxLength={40} onChange={ev => patch(i, { id: ev.target.value })} />}</Field>
                    <Field label="Name" error={e('name')}>{p => <Input {...p} value={s.name} maxLength={120} onChange={ev => patch(i, { name: ev.target.value })} />}</Field>
                  </div>
                  <Field label="URL" error={e('url')} hint="Must start with https://">{p => <Input {...p} type="url" value={s.url} maxLength={300} onChange={ev => patch(i, { url: ev.target.value })} />}</Field>
                  <ChipList draftKey={`mcp:${i}`} label="Tool allow-list" values={s.toolAllowlist} onChange={toolAllowlist => patch(i, { toolAllowlist })} max={50} placeholder="tool_name" error={e('toolAllowlist')} hint="Empty means no tools are allowed yet." />
                  <div className={styles.toggleRow}><div><label htmlFor={`mcp-${i}-on`}>Enabled in configuration</label><p>Records a preference; tools remain unavailable to the agent.</p></div><Switch id={`mcp-${i}-on`} checked={s.enabled} onCheckedChange={enabled => patch(i, { enabled })} /></div>
                </ItemCard>
              );
            })}
            {errors.mcpServers && <p className="text-xs text-destructive">{errors.mcpServers}</p>}
            <div className={styles.directoryActions}><Button type="button" variant="outline" disabled={draft.mcpServers.length >= 20} onClick={() => { update({ mcpServers: [...draft.mcpServers, newMcp()] }); setOpen(draft.mcpServers.length); }}><Plus aria-hidden /> Add server</Button><p>{draft.mcpServers.length} of 20 servers</p></div></div>
          </>
        );
      }}
    </ConfigPage>
  );
}
