'use client';

import { useEffect, useState } from 'react';
import { Copy, FolderOpen, MessageSquare, Minus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Settings2, Square, X } from 'lucide-react';
import '@/lib/desktop';

export function DesktopTitlebar({ onSettings, left, right, onToggleLeft, onToggleRight, title, project, options, leftWidth=208, nativeAvailable=true, settingsOpen=false }: { onSettings: () => void; left:boolean; right:boolean; onToggleLeft:()=>void; onToggleRight:()=>void; title:string; project?:string; options?:React.ReactNode;nativeAvailable?:boolean;leftWidth?:number;settingsOpen?:boolean }) {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    const desktop = window.desktop;
    if (!desktop) return;
    void desktop.windowState().then(state => setMaximized(state.maximized));
    return desktop.onWindowState(state => setMaximized(state.maximized));
  }, []);
  return <header className={`desktop-titlebar chat-window-header${left?'':' sidebar-hidden'}${settingsOpen?' settings-view':''}`} aria-label="Workspace navigation" style={{'--left-panel-width':`${leftWidth}px`} as React.CSSProperties}>
    <div className="desktop-navigation-header">
    <button className="desktop-panel-toggle" aria-label={left?'Hide sidebar':'Show sidebar'} title={left?'Hide left sidebar':'Show left sidebar'} aria-expanded={left} aria-controls={left?'workspace-sidebar':undefined} onClick={onToggleLeft}>{left?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}</button>
    <div className="desktop-drag"><img src="/datumm-mark.png" alt=""/><span>DATUMM</span></div>
    </div>
    <div className="desktop-drag desktop-chat-title"><FolderOpen size={17}/><span className="current-chat-title" title={project??title}>{project??'Architectural workspace'}</span><small>/ &nbsp;{project?'Architectural workspace':title}</small></div>
    <div className="desktop-chat-actions">{options}
    <button className="desktop-panel-toggle" aria-label={right?'Hide inspector':'Show inspector'} title={right?'Hide right inspector':'Show right inspector'} aria-expanded={right} aria-controls={right?'workspace-inspector':undefined} onClick={onToggleRight}>{right?<PanelRightClose size={17}/>:<PanelRightOpen size={17}/>}</button>
    <button className="desktop-settings" aria-label="Settings" title="Settings (Ctrl+,)" onClick={onSettings}><Settings2 size={15}/></button>
    {nativeAvailable&&<div className="window-controls" role="group" aria-label="Window controls" title={nativeAvailable?undefined:"Desktop window controls are unavailable in browser preview"}>
      <button disabled={!nativeAvailable} aria-label="Minimize window" title="Minimize" onClick={() => void window.desktop?.minimize()}><Minus size={16}/></button>
      <button disabled={!nativeAvailable} aria-label={maximized ? 'Restore window' : 'Maximize window'} title={maximized ? 'Restore' : 'Maximize'} onClick={() => void window.desktop?.maximize()}>{maximized ? <Copy size={14}/> : <Square size={14}/>}</button>
      <button disabled={!nativeAvailable} className="window-close" aria-label="Close window" title="Close" onClick={() => void window.desktop?.close()}><X size={17}/></button>
    </div>}
    </div>
  </header>;
}
