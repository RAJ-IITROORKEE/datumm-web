import { Clock3, Settings2, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Folder, LayoutGrid, PanelLeftOpen, Search, SquarePen } from './sidebar-icons';
import { AccountFooter } from './sidebar-account';
import type { WorkspaceState } from './use-workspace-state';
import styles from './sidebar.module.css';

type Project = WorkspaceState['orderedProjects'][number];
export type RailContext = Pick<
  WorkspaceState,
  | 'mediaBusy' | 'actionBusy' | 'setLeft' | 'openStudioView' | 'changeSettingsOpen'
  | 'authConfigured' | 'setHistoryView'
> & {
  showProjects: boolean;
  orderedProjects: Project[];
  selectedProjectId: string | undefined;
  expandNavigation: () => void;
  openSearch: (opener: HTMLElement | null) => void;
  newTask: (projectId?: string) => void;
  focusProjects: () => void;
  openConnections: () => void;
  selectProjectFilter: (projectId: string | null) => void;
  confirmDeleteAll: () => void;
};

/** The collapsed navigation rail; a plain function so the Sidebar tree stays one flat tree. */
export function collapsedRail(c: RailContext) {
  const { mediaBusy, actionBusy, setLeft, openStudioView, changeSettingsOpen, authConfigured,
    setHistoryView, showProjects, orderedProjects, selectedProjectId, expandNavigation, openSearch,
    newTask, focusProjects, openConnections, selectProjectFilter, confirmDeleteAll } = c;
  const showProjectsSection = () => { setLeft(true); requestAnimationFrame(focusProjects); };
  return (
    <nav className={cn('studio-nav-rail', styles.rail)} aria-label="Collapsed navigation">
      <img src="/datumm-mark.png" className={styles.workspaceLogo} width={22} height={22}
        alt="DATUMM" />
      <button type="button" aria-label="Expand navigation" title="Expand navigation"
        aria-controls="workspace-sidebar" aria-expanded={false} onClick={expandNavigation}>
        <PanelLeftOpen size={18} />
      </button>
      <button type="button" aria-label="Search chats and projects" title="Search chats and projects"
        aria-haspopup="dialog" onClick={event => openSearch(event.currentTarget)}>
        <Search size={16} />
      </button>
      <button
        type="button"
        aria-label="New chat"
        title="New chat"
        disabled={mediaBusy || actionBusy}
        onClick={() => newTask(selectedProjectId)}
      >
        <SquarePen size={16} strokeWidth={1.9} />
      </button>
      <button type="button" aria-label="Projects" title="Projects" aria-controls="sidebar-projects"
        onClick={showProjectsSection}>
        <Folder size={16} />
      </button>
      <button type="button" aria-label="Connections" title="Connections" onClick={openConnections}>
        <LayoutGrid size={16} />
      </button>
      {showProjects && orderedProjects.map(project => (
        <button key={project.id} type="button" aria-label={`Open project ${project.title}`}
          title={project.title}
          onClick={() => { selectProjectFilter(project.id); showProjectsSection(); }}>
          <Folder size={16} />
        </button>
      ))}
      <button type="button" aria-label="Activity" title="Activity"
        onClick={() => openStudioView('activity')}>
        <Workflow size={18} />
      </button>
      <button
        type="button"
        aria-label="Scheduled tasks"
        title="Scheduled tasks"
        onClick={() => openStudioView('schedules')}
      >
        <Clock3 size={18} />
      </button>
      <button type="button" aria-label="Settings" title="Settings"
        onClick={() => changeSettingsOpen(true)}>
        <Settings2 size={18} />
      </button>
      <div className={styles.railAccount}>
        <AccountFooter compact authConfigured={authConfigured}
          openActivity={() => openStudioView('activity')}
          openSchedules={() => openStudioView('schedules')}
          openSettings={() => changeSettingsOpen(true)}
          openConnections={openConnections}
          openArchived={() => { setHistoryView('archived'); setLeft(true); }}
          confirmDeleteAll={confirmDeleteAll} />
      </div>
    </nav>
  );
}
