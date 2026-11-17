import type { ReactNode, RefObject } from 'react';
import { Archive, Check, Pencil, Plus } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { groupChatsByDate, pinnedChats, recentChats } from '@/lib/sidebar-history.mjs';
import { cn } from '@/lib/utils';
import { ChevronDown, Ellipsis, Folder, FolderOpen, Pin } from './sidebar-icons';
import { ProjectCreate } from './project-create';
import type { WorkspaceState, Run } from './use-workspace-state';
import styles from './sidebar.module.css';

export type ChatSectionsContext = Pick<
  WorkspaceState,
  | 'mediaBusy'
  | 'actionBusy'
  | 'createProject'
  | 'setProjectContextOpen'
  | 'workspaceReady'
  | 'orderedProjects'
  | 'serviceError'
  | 'collapsedProjects'
  | 'search'
  | 'setCollapsedProjects'
  | 'dialogTrigger'
  | 'newTask'
  | 'setRenameTitle'
  | 'setRenameTarget'
  | 'setProjectOrder'
  | 'chatMenuUnsupported'
  | 'archiveProject'
  | 'historyView'
  | 'defaultProject'
  | 'workflowFilter'
  | 'setWorkflowFilter'
> & {
  visibleChats: Run[];
  chatRow: (item: Run) => ReactNode;
  projectSection: RefObject<HTMLElement | null>;
  pendingOverview: RefObject<string | null>;
  setOverviewId: (id: string) => void;
  showProjects: boolean;
  hosted: boolean;
  canCreateProject: boolean;
  selectedProject: WorkspaceState['orderedProjects'][number] | undefined;
  knownProjectIds: Set<string>;
};

/**
 * Returns an array (not a fragment) so the history region keeps one flat list of sections.
 * Archived view and search results stay flat; other chats are grouped by creation date.
 */
export function chatSections(c: ChatSectionsContext) {
  const {
    visibleChats, chatRow, projectSection, pendingOverview, setOverviewId, showProjects, hosted,
    canCreateProject, selectedProject, knownProjectIds, mediaBusy, actionBusy, createProject,
    setProjectContextOpen, workspaceReady, orderedProjects, serviceError, collapsedProjects, search,
    setCollapsedProjects, dialogTrigger, newTask, setRenameTitle, setRenameTarget, setProjectOrder,
    chatMenuUnsupported, archiveProject, historyView,
    defaultProject, workflowFilter, setWorkflowFilter,
  } = c;
  const recent = recentChats(visibleChats, showProjects, defaultProject, knownProjectIds);
  const projectOpen = (id: string) => !collapsedProjects.includes(id) || Boolean(search);
  return [
    visibleChats.some((item) => item.pinned_at) && (
      <section key="pinned" className={styles.chatGroup}>
        <div className={styles.sectionHeading}>
          <Pin size={13} />
          <h2>Pinned</h2>
        </div>
        {pinnedChats(visibleChats).map(chatRow)}
      </section>
    ),
    <section key="projects" id="sidebar-projects" ref={projectSection} tabIndex={-1}
      className={styles.projectGroups} aria-label="Projects">
      <div className={styles.sectionHeading}>
        <FolderOpen size={13} />
        <h2>Projects</h2>
        {showProjects && (hosted ? (
          canCreateProject && (
            <ProjectCreate disabled={mediaBusy || actionBusy} onCreate={createProject} />
          )
        ) : (
          <button
            className={styles.smallButton}
            aria-label="Projects & local files"
            onClick={() => setProjectContextOpen(true)}
          >
            <Plus size={15} />
          </button>
        ))}
      </div>
      {!workspaceReady && <p className={styles.empty} role="status">Loading projects…</p>}
      {workspaceReady && !showProjects && (
        <p className={styles.empty} role="status">Projects are unavailable on this service.</p>
      )}
      {workspaceReady && showProjects && !orderedProjects.length && (
        <p className={styles.empty} role="status">
          {serviceError
            ? 'Projects could not refresh. Retry the workspace connection.'
            : 'No projects yet.'}
        </p>
      )}
      {showProjects && orderedProjects
        .filter(project => !selectedProject || project.id === selectedProject.id)
        .map((project) => (
          <section key={project.id} className={styles.projectGroup}>
            <div className={styles.projectHeading}>
              <button
                className={styles.projectToggle}
                aria-expanded={projectOpen(project.id)}
                onClick={() => {
                  const value = collapsedProjects.includes(project.id)
                    ? collapsedProjects.filter((id) => id !== project.id)
                    : [...collapsedProjects, project.id];
                  setCollapsedProjects(value);
                  localStorage.setItem('datumm-collapsed-projects', JSON.stringify(value));
                }}
              >
                {collapsedProjects.includes(project.id) && !search
                  ? <Folder size={16} strokeWidth={1.9} aria-hidden="true" />
                  : <FolderOpen size={16} strokeWidth={1.9} aria-hidden="true" />}
                <span title={project.title} dir="auto">{project.title}</span>
                {projectOpen(project.id) && (
                  <ChevronDown size={12} strokeWidth={1.9} aria-hidden="true" />
                )}
              </button>
              <DropdownMenuPrimitive.Root>
                <DropdownMenuPrimitive.Trigger asChild>
                  <button type="button" disabled={mediaBusy || actionBusy}
                    className={cn(styles.smallButton, styles.projectMenu)}
                    aria-label={`Options for project ${project.title}`}
                    onClick={event => { dialogTrigger.current = event.currentTarget; }}>
                    <Ellipsis size={15} strokeWidth={1.9} />
                  </button>
                </DropdownMenuPrimitive.Trigger>
                <DropdownMenuPrimitive.Portal>
                  <DropdownMenuPrimitive.Content
                    className="action-menu"
                    onCloseAutoFocus={event => {
                      if (pendingOverview.current !== project.id) return;
                      event.preventDefault();
                      pendingOverview.current = null;
                      setOverviewId(project.id);
                    }}>
                    <DropdownMenuPrimitive.Item
                      onSelect={() => { pendingOverview.current = project.id; }}>
                      <FolderOpen size={14} />
                      Open project
                    </DropdownMenuPrimitive.Item>
                    {!project.archived_at && (
                      <DropdownMenuPrimitive.Item onSelect={() => newTask(project.id)}>
                        <Plus size={14} />
                        New chat in project
                      </DropdownMenuPrimitive.Item>
                    )}
                    <DropdownMenuPrimitive.Item
                      onSelect={() => {
                        setRenameTitle(project.title);
                        setRenameTarget({
                          kind: 'project',
                          id: project.id,
                          title: project.title,
                          revision: project.revision ?? 1,
                        });
                      }}
                    >
                      <Pencil size={14} />
                      Rename project
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item
                      onSelect={() => {
                        const order = [
                          project.id,
                          ...orderedProjects.filter((row) => row.id !== project.id)
                            .map((row) => row.id),
                        ];
                        setProjectOrder(order);
                        localStorage.setItem('datumm-project-order', JSON.stringify(order));
                      }}
                    >
                      Move to top
                    </DropdownMenuPrimitive.Item>
                    {hosted && !chatMenuUnsupported.includes('projects') && (
                      <DropdownMenuPrimitive.Item onSelect={() => void archiveProject(project)}>
                        <Archive size={14} />
                        {project.archived_at ? 'Restore project' : 'Archive project'}
                      </DropdownMenuPrimitive.Item>
                    )}
                  </DropdownMenuPrimitive.Content>
                </DropdownMenuPrimitive.Portal>
              </DropdownMenuPrimitive.Root>
            </div>
            {projectOpen(project.id) && (
              <div className={styles.projectChats}>
                {visibleChats
                  .filter((item) => item.projectId === project.id && !item.pinned_at)
                  .map(chatRow)}
                {!visibleChats.some((item) => item.projectId === project.id) && (
                  <button type="button" className={styles.projectEmpty}
                    disabled={mediaBusy || actionBusy || Boolean(project.archived_at)}
                    onClick={() => newTask(project.id)}>
                    <Plus size={12} />
                    New chat
                  </button>
                )}
              </div>
            )}
          </section>
        ))}
    </section>,
    (!selectedProject || recent.length > 0) && <section key="chats" className={styles.chatGroup}>
      <div className={styles.sectionHeading}>
        <h2>{historyView === 'archived' ? 'Archived chats' : 'Chats'}</h2>
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <button className={styles.smallButton} aria-label="Chat filters">
              <Ellipsis size={15} />
            </button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content className="action-menu">
              <DropdownMenuPrimitive.Item onSelect={() => setProjectContextOpen(true)}>
                <FolderOpen size={14} />
                Projects & local files
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Separator />
              {[
                ['', 'All chats'],
                ['in_progress', 'In progress'],
                ['needs_input', 'Needs input'],
                ['ready_review', 'Ready for review'],
              ].map(([id, label]) => (
                <DropdownMenuPrimitive.Item key={id} onSelect={() => setWorkflowFilter(id)}>
                  {workflowFilter === id ? <Check size={14} /> : <span className="menu-spacer" />}
                  {label}
                </DropdownMenuPrimitive.Item>
              ))}
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
      </div>
      {historyView === 'archived' || search
        ? recent.map(chatRow)
        : groupChatsByDate(recent).map((group) => (
          <div key={group.label} className={styles.dateGroup}>
            <h3 className={styles.dateHeading}>{group.label}</h3>
            {group.items.map(chatRow)}
          </div>
        ))}
    </section>,
    !visibleChats.length && (
      <p key="empty" className={styles.empty}>
        {!workspaceReady ? 'Loading chat history...'
          : serviceError ? 'History could not refresh. Retry the workspace connection.'
          : search ? 'No matching chats.'
          : historyView === 'archived' ? 'No archived chats.'
          : selectedProject ? 'No chats in this project yet.'
          : 'Start a chat to save your work.'}
      </p>
    )
  ];
}
