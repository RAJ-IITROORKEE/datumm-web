import { PanelResize } from '../panel-resize';
import { cn } from '@/lib/utils';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import {
  Ellipsis,
  Download,
  Unplug,
  PanelRightClose,
  Expand,
  ArrowUpRight,
  ShieldCheck,
  Box,
  Layers3,
  Workflow,
  ChevronDown,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import { StudioProperties } from '../studio-properties';
import { Button } from '@/components/ui/button';
import { ContextUsage, AgentMemory } from '../agent-memory';
import { ActivitySummary, AgentActivity } from '../agent-activity';
import { AgentScheduler } from '../agent-scheduler';
import { AgentSpecialists } from '../agent-specialists';
import { BriefChips } from './brief-chips';
import { PipelineTrace } from '../pipeline-trace';
import { type WorkspaceState } from './use-workspace-state';

type InspectorProps = Pick<
  WorkspaceState,
  | 'right'
  | 'viewportReady'
  | 'setRight'
  | 'panelWidths'
  | 'resizePanel'
  | 'tab'
  | 'hasRenderablePlan'
  | 'setTab'
  | 'studioView'
  | 'activeDrawing'
  | 'selectedDesignElement'
  | 'setSelectedDesignElement'
  | 'askFromCanvas'
  | 'focusReview'
  | 'plannedCandidate'
  | 'separateNativeFollowup'
  | 'openCanvas'
  | 'offlineFixture'
  | 'desktopPreview'
  | 'run'
  | 'contextTitle'
  | 'contextView'
  | 'selectedDevice'
  | 'dialogTrigger'
  | 'setDeviceDialog'
  | 'previewSvg'
  | 'drawingCurrent'
  | 'previewLabel'
  | 'previewCounts'
  | 'previewRooms'
  | 'currentActivity'
  | 'executing'
  | 'desktopAvailable'
  | 'runId'
  | 'mode'
  | 'model'
  | 'eventDetail'
  | 'exportItems'
  | 'mcpToolsError'
  | 'mcpTools'
  | 'refresh'
  | 'workspaceReady'
> & { conversationPanel: React.ReactNode; planDetails: React.ReactNode };

export function Inspector(props: InspectorProps) {
  const {
    right,
    viewportReady,
    setRight,
    panelWidths,
    resizePanel,
    tab,
    hasRenderablePlan,
    setTab,
    studioView,
    conversationPanel,
    planDetails,
    activeDrawing,
    selectedDesignElement,
    setSelectedDesignElement,
    askFromCanvas,
    focusReview,
    plannedCandidate,
    separateNativeFollowup,
    openCanvas,
    offlineFixture,
    desktopPreview,
    run,
    contextTitle,
    contextView,
    selectedDevice,
    dialogTrigger,
    setDeviceDialog,
    previewSvg,
    drawingCurrent,
    previewLabel,
    previewCounts,
    previewRooms,
    currentActivity,
    executing,
    desktopAvailable,
    runId,
    mode,
    model,
    eventDetail,
    exportItems,
    mcpToolsError,
    mcpTools,
    refresh,
    workspaceReady,
  } = props;
  return (
    <>
      {right && viewportReady && (
        <button className="inspector-backdrop" aria-label="Close inspector panel" onClick={() => setRight(false)} />
      )}
      {right && (
        <aside id="workspace-inspector" className="inspector">
          <PanelResize side="right" width={panelWidths.right} onChange={(value) => resizePanel('right', value)} />
          <div className="inspector-tabs">
            {(['assistant', 'preview', 'activity'] as const).map((t) => (
              <button
                type="button"
                key={t}
                className={cn(tab === t && 'active')}
                disabled={t === 'assistant' && !hasRenderablePlan}
                title={
                  t === 'assistant' && !hasRenderablePlan
                    ? 'Conversation stays in the main panel until a plan is ready'
                    : undefined
                }
                onClick={() => setTab(t)}
              >
                {t === 'assistant' ? 'Agent' : t === 'preview' ? 'Properties' : 'Activity'}
              </button>
            ))}
            <DropdownMenuPrimitive.Root>
              <DropdownMenuPrimitive.Trigger asChild>
                <button type="button" className="studio-panel-options" aria-label="More workspace panels">
                  <Ellipsis size={15} />
                </button>
              </DropdownMenuPrimitive.Trigger>
              <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content className="action-menu" side="bottom" align="end">
                  <DropdownMenuPrimitive.Item onSelect={() => setTab('exports')}>
                    <Download size={14} />
                    Exports
                  </DropdownMenuPrimitive.Item>
                  <DropdownMenuPrimitive.Item onSelect={() => setTab('tools')}>
                    <Unplug size={14} />
                    MCP tools
                  </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
              </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
            <button
              type="button"
              className="studio-inspector-close"
              aria-label="Collapse agent panel"
              onClick={() => setRight(false)}
            >
              <PanelRightClose size={16} />
            </button>
          </div>
          {(hasRenderablePlan || studioView !== 'workspace') && (
            <div className="studio-assistant-panel" hidden={tab !== 'assistant'}>
              {conversationPanel}
            </div>
          )}
          {tab !== 'assistant' && (
            <>
              {tab === 'preview' && <BriefChips run={run} />}
              {activeDrawing && tab === 'preview' ? (
                <StudioProperties
                  key={activeDrawing.fingerprint + ':' + selectedDesignElement}
                  drawing={activeDrawing}
                  selected={selectedDesignElement}
                  onSelect={setSelectedDesignElement}
                  onRequest={askFromCanvas}
                  onReview={!hasRenderablePlan || (run?.mode ?? mode) === 'ask' ? undefined : () => focusReview('[aria-label="Validated design preview"]')}
                />
              ) : (
                <>
                  {plannedCandidate && tab === 'preview' ? (
                    <div className="inspector-body">
                      <div className="section-caption">
                        {separateNativeFollowup ? 'SAVED DESIGN REFERENCE' : 'SHARED DESIGN GEOMETRY'}{' '}
                        <button
                          className="icon-button"
                          aria-label="Expand design preview"
                          onClick={(event) => openCanvas(event.currentTarget)}
                        >
                          <Expand size={16} />
                        </button>
                      </div>
                      <div className="studio-property-grid">
                        <div>
                          <small>Plan version</small>
                          <strong>v{plannedCandidate.graph.version}</strong>
                        </div>
                        <div>
                          <small>Footprint · mm</small>
                          <strong>
                            {plannedCandidate.graph.site.widthMm.toLocaleString()} ×{' '}
                            {plannedCandidate.graph.site.depthMm.toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          <small>Rooms</small>
                          <strong>{plannedCandidate.graph.rooms.length}</strong>
                        </div>
                        <div>
                          <small>Wall height · mm</small>
                          <strong>{plannedCandidate.graph.wallHeightMm ?? 'Unavailable'}</strong>
                        </div>
                        <div className="studio-property-identity">
                          <small>Design identity</small>
                          <code>{plannedCandidate.fingerprint}</code>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => focusReview('[aria-label="Validated design preview"]')}
                        >
                          Review exact design
                          <ArrowUpRight size={14} />
                        </Button>
                      </div>
                      <p>
                        {separateNativeFollowup
                          ? 'Saved design reference. It does not include this separate native proposal or later native room-name changes.'
                          : 'Proposed layout · same version in 2D and 3D. Native placement and approval are separate.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {tab === 'preview' && offlineFixture && !desktopPreview ? (
                        <div className="inspector-body">
                          <div className="section-caption">
                            OFFLINE BRIEF CHECK <ShieldCheck size={14} />
                          </div>
                          <div className="model-card">
                            <strong>Exact fixture geometry</strong>
                            <p>9144 × 12192 mm footprint · 8 room requirements.</p>
                            <p>
                              {run
                                ? 'The source V3 brief validators completed.'
                                : 'Run the offline check to validate the packaged local backend.'}
                            </p>
                            <p>No AI inference, design preview or Revit operation is available in this runtime.</p>
                          </div>
                        </div>
                      ) : tab === 'preview' ? (
                        <div className="inspector-body">
                          <div className="section-caption">
                            CURRENT MODEL <Box size={14} />
                          </div>
                          <div className="model-card">
                            <div className="model-icon">
                              <Layers3 size={23} />
                            </div>
                            <strong>{contextTitle}</strong>
                            <p>{contextView}</p>
                            {!selectedDevice?.online && (
                              <button
                                onClick={(event) => {
                                  dialogTrigger.current = event.currentTarget;
                                  setDeviceDialog(true);
                                }}
                              >
                                Connect a device <ArrowUpRight size={13} />
                              </button>
                            )}
                          </div>
                          <div className="section-caption">
                            DESIGN CANVAS{' '}
                            <button
                              className="icon-button"
                              aria-label="Expand design preview"
                              disabled={!previewSvg}
                              onClick={(event) => openCanvas(event.currentTarget)}
                            >
                              <Expand size={16} />
                            </button>
                          </div>
                          {previewSvg ? (
                            <>
                              {run?.data.agent_design && !drawingCurrent && (
                                <p role="status">Older alternative preview · current drawing unavailable</p>
                              )}
                              <div className="plan-image">
                                <img
                                  alt={previewLabel}
                                  src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(previewSvg ?? '')}
                                />
                              </div>
                              <div className="element-counts">
                                {Object.entries(previewCounts).map(([name, count]) => (
                                  <div key={name}>
                                    <strong>{count}</strong>
                                    <span>{count === 1 ? name.replace(/s$/, '') : name}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="room-list">
                                {previewRooms.map((room) => (
                                  <div key={room.name}>
                                    <span>{room.name}</span>
                                    <span>{room.expectedAreaM2.toFixed(1)} m²</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="empty-canvas">
                              <div className="floor-glyph">
                                <i />
                                <i />
                                <i />
                              </div>
                              <p>A place for your next idea</p>
                              <small>Your proposed plan will appear here.</small>
                            </div>
                          )}
                          <div className="inspector-tip">
                            <ShieldCheck size={16} />
                            <p>
                              You stay in control.
                              <br />
                              <span>Inspect, preview, approve. Then build.</span>
                            </p>
                          </div>
                        </div>
                      ) : tab === 'activity' ? (
                        <div className="inspector-body studio-activity-inspector">
                          <div className="studio-page-heading">
                            <div>
                              <h2>{run?.title ?? 'Task activity'}</h2>
                              <p>One task. Actual runtime steps and recorded outcomes.</p>
                            </div>
                            <ContextUsage usage={currentActivity?.usage} busy={executing} />
                          </div>
                          {currentActivity?.events.length ? (
                            <ActivitySummary events={currentActivity.events} />
                          ) : (
                            <div className="studio-empty studio-activity-empty">
                              <p>No runtime events were recorded for this turn.</p>
                            </div>
                          )}
                          {run?.data.agent_scheduler && <AgentScheduler value={run.data.agent_scheduler} />}
                          {run && <AgentSpecialists results={run.data.agent_specialists} taskId={run.id} />}
                          <details className="studio-activity-details">
                            <summary>
                              <Workflow size={15} />
                              View pipeline details
                              <ChevronDown size={14} />
                            </summary>
                            <div>
                              {desktopAvailable && runId && <PipelineTrace taskId={runId} />}
                              {run?.data.agent_memory && (
                                <AgentMemory
                                  memory={run.data.agent_memory}
                                  metrics={run.data.agent_context}
                                  runId={run.id}
                                />
                              )}
                              <AgentActivity
                                nativeMessages={executing ? currentActivity?.nativeMessages : undefined}
                                events={currentActivity?.events ?? []}
                                active={executing}
                                waiting={currentActivity?.waiting ?? false}
                                mode={run?.mode ?? mode}
                                model={run?.model ?? model}
                                todos={currentActivity?.todos ?? []}
                                manifest={currentActivity?.manifest}
                                evidence={currentActivity?.evidence ?? []}
                                showFeed={false}
                              />
                              <div className="section-caption">
                                RUN TIMELINE <span>{currentActivity?.events.length ?? 0} events</span>
                              </div>
                              {currentActivity?.events.length ? (
                                <ol className="timeline">
                                  {currentActivity.events.map((e, i) => (
                                    <li key={e.eventId ?? e.index}>
                                      <span
                                        className={cn(
                                          'timeline-dot',
                                          i === currentActivity.events.length - 1 && executing && 'live',
                                        )}
                                      />
                                      <strong>
                                        {e.stage === 'paused_limit'
                                          ? 'Analysis checkpoint'
                                          : e.stage.replaceAll('_', ' ')}
                                      </strong>
                                      <p>{eventDetail(e)}</p>
                                      <small>{e.at ? new Date(e.at).toLocaleTimeString() : ''}</small>
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <div className="inspector-empty">
                                  <Workflow size={26} />
                                  <p>No additional timeline details were recorded.</p>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      ) : tab === 'exports' ? (
                        <div className="inspector-body">
                          {planDetails}
                          <div className="section-caption">
                            RUN ARTIFACTS <Download size={14} />
                          </div>
                          {run ? (
                            <div className="exports">
                              {exportItems.map((a) => (
                                <a key={a.ext} href={`/api/service/runs/${run.id}/export/${a.ext}`} download>
                                  <a.icon size={20} />
                                  <span>
                                    {a.name}
                                    <small>{a.detail}</small>
                                  </span>
                                  <Download size={14} />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="inspector-empty">
                              <FolderOpen size={26} />
                              <p>Good work deserves a record.</p>
                              <small>Run a task to export its plan, room schedule and verification record.</small>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="inspector-body">
                          <div className="section-caption">
                            MCP TOOLS <Unplug size={14} />
                            <span>{mcpToolsError ? 'Unavailable' : `${mcpTools.length} available`}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Refresh MCP tools"
                            onClick={() => void refresh()}
                          >
                            <RotateCcw size={14} /> Refresh tools
                          </Button>
                          {mcpToolsError ? (
                            <p className="error-banner" role="alert">
                              Could not load MCP tools: {mcpToolsError}
                            </p>
                          ) : mcpTools.length ? (
                            mcpTools.map((tool) => {
                              const properties = Object.entries(tool.inputSchema?.properties ?? {}),
                                required = new Set(tool.inputSchema?.required ?? []);
                              return (
                                <details key={tool.name} className="mcp-tool">
                                  <summary>
                                    <strong>{tool.name}</strong>
                                    <ChevronDown size={14} aria-hidden="true" />
                                  </summary>
                                  <p>{tool.description ?? 'No description was provided by the bridge.'}</p>
                                  {properties.length ? (
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Parameter</th>
                                          <th>Type</th>
                                          <th>Use</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {properties.map(([name, schema]) => (
                                          <tr key={name}>
                                            <td>
                                              {name}
                                              {required.has(name) && <small>required</small>}
                                            </td>
                                            <td>{schema.type ?? 'any'}</td>
                                            <td>
                                              {schema.description ?? '—'}
                                              {schema.enum ? (
                                                <small>Allowed: {schema.enum.map(String).join(', ')}</small>
                                              ) : null}
                                              {schema.default !== undefined ? (
                                                <small>Default: {String(schema.default)}</small>
                                              ) : null}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p>
                                      <small>No input parameters.</small>
                                    </p>
                                  )}
                                </details>
                              );
                            })
                          ) : (
                            <div className="inspector-empty">
                              <Unplug size={26} />
                              <p>{workspaceReady ? 'No MCP tools discovered.' : 'Loading MCP tools…'}</p>
                              <small>
                                Connect a model in Settings and check the installed DATUMM MCP bridge, then refresh
                                tools.
                              </small>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
          <div className="inspector-foot">
            <span>DATUMM</span>
            <span>DESIGN WITH INTENT</span>
          </div>
        </aside>
      )}
    </>
  );
}
