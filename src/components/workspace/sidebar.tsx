import { pinnedChats, recentChats } from '@/lib/sidebar-history.mjs';
import { cn } from '@/lib/utils';
import {
  Pin,
  MessageSquare,
  CircleHelp,
  Ellipsis,
  Archive,
  FolderOpen,
  Trash2,
  PanelLeftClose,
  Plus,
  Search,
  Clock3,
  Workflow,
  Folder,
  Pencil,
  Check,
  Settings2,
  PanelLeftOpen,
  Monitor,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import { hasPendingQuestion, workflowState } from '@/lib/workflow-state';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { PanelResize } from '../panel-resize';
import { useUser, useClerk, Show, SignInButton } from '@clerk/nextjs';
import { type WorkspaceState, type Run } from './use-workspace-state';

function ProfileMenu({
  openConnections,
  openArchived,
  confirmDeleteAll,
}: {
  openConnections: () => void;
  openArchived: () => void;
  confirmDeleteAll: () => void;
}) {
  const { user } = useUser(),
    { signOut } = useClerk();
  return (
    <div className="profile-row">
      <img className="profile-avatar" src={user?.imageUrl} alt="" />
      <span className="profile-name">{user?.fullName || user?.firstName || user?.username || 'Your account'}</span>
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button className="icon-button" aria-label="Account settings">
            <Settings2 size={17} />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content className="action-menu account-menu" side="top" align="end" sideOffset={9}>
            <DropdownMenuPrimitive.Item onSelect={openArchived}>
              <Archive size={15} /> Archived chats
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item onSelect={openConnections}>
              <Monitor size={15} /> Connections
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Separator />
            <DropdownMenuPrimitive.Item className="danger-item" onSelect={confirmDeleteAll}>
              <Trash2 size={15} /> Delete all chats
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item onSelect={() => void signOut()}>
              <LogOut size={15} /> Sign out
            </DropdownMenuPrimitive.Item>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}

function AccountFooter({
  authConfigured,
  openConnections,
  openArchived,
  confirmDeleteAll,
}: {
  authConfigured: boolean;
  openConnections: () => void;
  openArchived: () => void;
  confirmDeleteAll: () => void;
}) {
  if (!authConfigured)
    return (
      <div className="profile-row">
        <CircleHelp size={18} />
        <span>Sign-in unavailable</span>
      </div>
    );
  return (
    <>
      <Show when="signed-in">
        <ProfileMenu
          openConnections={openConnections}
          openArchived={openArchived}
          confirmDeleteAll={confirmDeleteAll}
        />
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="profile-signin">
            Sign in to DATUMM <ArrowUpRight size={15} />
          </button>
        </SignInButton>
      </Show>
    </>
  );
}

type SidebarProps = Pick<
  WorkspaceState,
  | 'runId'
  | 'mediaBusy'
  | 'actionBusy'
  | 'selectRun'
  | 'dialogTrigger'
  | 'updateHistory'
  | 'setProjectContextOpen'
  | 'setDeleteTarget'
  | 'left'
  | 'viewportReady'
  | 'setLeft'
  | 'panelWidths'
  | 'resizePanel'
  | 'toggleLeft'
  | 'newTask'
  | 'search'
  | 'setSearch'
  | 'studioView'
  | 'setStudioView'
  | 'runs'
  | 'historyView'
  | 'filteredChats'
  | 'desktopAvailable'
  | 'orderedProjects'
  | 'collapsedProjects'
  | 'setCollapsedProjects'
  | 'setRenameTitle'
  | 'setRenameTarget'
  | 'setProjectOrder'
  | 'setWorkflowFilter'
  | 'workflowFilter'
  | 'defaultProject'
  | 'changeSettingsOpen'
  | 'authConfigured'
  | 'setDeviceDialog'
  | 'setHistoryView'
  | 'setDeletePhrase'
  | 'setDeleteAllOpen'
>;

export function Sidebar(props: SidebarProps) {
  const {
    runId,
    mediaBusy,
    actionBusy,
    selectRun,
    dialogTrigger,
    updateHistory,
    setProjectContextOpen,
    setDeleteTarget,
    left,
    viewportReady,
    setLeft,
    panelWidths,
    resizePanel,
    toggleLeft,
    newTask,
    search,
    setSearch,
    studioView,
    setStudioView,
    runs,
    historyView,
    filteredChats,
    desktopAvailable,
    orderedProjects,
    collapsedProjects,
    setCollapsedProjects,
    setRenameTitle,
    setRenameTarget,
    setProjectOrder,
    setWorkflowFilter,
    workflowFilter,
    defaultProject,
    changeSettingsOpen,
    authConfigured,
    setDeviceDialog,
    setHistoryView,
    setDeletePhrase,
    setDeleteAllOpen,
  } = props;
  const chatRow = (item: Run) => (
    <div key={item.id} className={cn('history-row', runId === item.id && 'selected')}>
      <button className="history-item" disabled={mediaBusy || actionBusy} onClick={() => selectRun(item)}>
        {item.pinned_at ? <Pin size={14} /> : <MessageSquare size={14} />}
        <span title={item.title}>{item.title}</span>
        {['queued', 'running'].includes(item.status) && workflowState(item).kind === 'in_progress' && (
          <span className="chat-running" aria-label="Chat running" />
        )}
        {hasPendingQuestion(item) && (
          <CircleHelp size={12} className="chat-attention" aria-label="Chat needs your answer" />
        )}
        {['failed', 'interrupted'].includes(item.status) && <span className="chat-error" role="img" aria-label="Chat failed" />}
      </button>
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            className="icon-button task-menu-trigger"
            aria-label={`Options for ${item.title}`}
            data-run-id={item.id}
            disabled={actionBusy}
            onClick={(event) => {
              dialogTrigger.current = event.currentTarget;
            }}
          >
            <Ellipsis size={16} />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content className="action-menu" align="start" sideOffset={5}>
            <DropdownMenuPrimitive.Item onSelect={() => void updateHistory(item, item.pinned_at ? 'unpin' : 'pin')}>
              <Pin size={14} />
              {item.pinned_at ? 'Unpin' : 'Pin chat'}
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              onSelect={() => void updateHistory(item, item.archived_at ? 'unarchive' : 'archive')}
            >
              <Archive size={14} />
              {item.archived_at ? 'Restore chat' : 'Archive'}
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              onSelect={() => {
                selectRun(item);
                setProjectContextOpen(true);
              }}
            >
              <FolderOpen size={14} />
              Projects & local files
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Separator />
            <DropdownMenuPrimitive.Item
              className="danger-item"
              onSelect={() => {
                dialogTrigger.current = document.querySelector<HTMLButtonElement>(`button[data-run-id="${item.id}"]`);
                setDeleteTarget(item);
              }}
            >
              <Trash2 size={14} />
              Delete chat
            </DropdownMenuPrimitive.Item>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
  return (
    <>
      {left && viewportReady && (
        <button className="sidebar-backdrop" aria-label="Close task navigation" onClick={() => setLeft(false)} />
      )}
      {left && (
        <aside id="workspace-sidebar" className="sidebar">
          <PanelResize side="left" width={panelWidths.left} onChange={(value) => resizePanel('left', value)} />

          <div className="studio-nav-caption">
            WORKSPACE
            <button type="button" className="icon-button" aria-label="Collapse navigation" onClick={toggleLeft}>
              <PanelLeftClose size={15} />
            </button>
          </div>

          <button className="new-task" onClick={() => newTask()} disabled={mediaBusy || actionBusy}>
            <Plus size={17} /> New chat <span>Ctrl+N</span>
          </button>

          <label className="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anything"
              aria-label="Search tasks"
            />
            <Search size={16} />
          </label>
          <nav className="studio-navigation" aria-label="Workspace views">
            <button
              type="button"
              aria-current={studioView === 'schedules' ? 'page' : undefined}
              onClick={() => setStudioView('schedules')}
            >
              <Clock3 size={17} />
              Scheduled tasks
            </button>
            <button
              type="button"
              aria-current={studioView === 'activity' ? 'page' : undefined}
              onClick={() => setStudioView('activity')}
            >
              <Workflow size={17} />
              Activity<span>{runs.filter((item) => workflowState(item).kind === 'in_progress').length || ''}</span>
            </button>
          </nav>

          <div
            className="history"
            role="region"
            aria-label={historyView === 'archived' ? 'Archived chats' : 'Recent tasks'}
            tabIndex={0}
          >
            {filteredChats.some((item) => item.pinned_at) && (
              <section className="chat-group">
                <div className="sidebar-section">
                  <Pin size={13} />
                  <span>Pinned</span>
                </div>
                {pinnedChats(filteredChats).map(chatRow)}
              </section>
            )}
            {desktopAvailable && (
              <section className="project-groups">
                <div className="sidebar-section">
                  <FolderOpen size={13} />
                  <span>Projects</span>
                  <button
                    className="icon-button"
                    aria-label="Projects & local files"
                    onClick={() => setProjectContextOpen(true)}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {orderedProjects.map((project) => (
                  <section key={project.id} className="project-group">
                    <div className="project-group-heading">
                      <button
                        className="project-group-toggle"
                        aria-expanded={!collapsedProjects.includes(project.id)}
                        onClick={() => {
                          const value = collapsedProjects.includes(project.id)
                            ? collapsedProjects.filter((id) => id !== project.id)
                            : [...collapsedProjects, project.id];
                          setCollapsedProjects(value);
                          localStorage.setItem('datumm-collapsed-projects', JSON.stringify(value));
                        }}
                      >
                        {collapsedProjects.includes(project.id) ? <Folder size={16} /> : <FolderOpen size={16} />}
                        <span title={project.title}>{project.title}</span>
                      </button>
                      <DropdownMenuPrimitive.Root>
                        <DropdownMenuPrimitive.Trigger asChild>
                          <button className="icon-button" aria-label={`Options for project ${project.title}`}>
                            <Ellipsis size={14} />
                          </button>
                        </DropdownMenuPrimitive.Trigger>
                        <DropdownMenuPrimitive.Portal>
                          <DropdownMenuPrimitive.Content className="action-menu">
                            <DropdownMenuPrimitive.Item onSelect={() => newTask(project.id)}>
                              <Plus size={14} />
                              New chat in project
                            </DropdownMenuPrimitive.Item>
                            <DropdownMenuPrimitive.Item
                              onSelect={() => {
                                setRenameTitle(project.title);
                                setRenameTarget({
                                  kind: 'project',
                                  id: project.id,
                                  title: project.title,
                                  revision: project.revision,
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
                                  ...orderedProjects.filter((row) => row.id !== project.id).map((row) => row.id),
                                ];
                                setProjectOrder(order);
                                localStorage.setItem('datumm-project-order', JSON.stringify(order));
                              }}
                            >
                              Move to top
                            </DropdownMenuPrimitive.Item>
                          </DropdownMenuPrimitive.Content>
                        </DropdownMenuPrimitive.Portal>
                      </DropdownMenuPrimitive.Root>
                    </div>
                    {(!collapsedProjects.includes(project.id) || Boolean(search)) && (
                      <div className="project-chats">
                        {filteredChats.filter((item) => item.projectId === project.id && !item.pinned_at).map(chatRow)}
                        {!filteredChats.some((item) => item.projectId === project.id) && (
                          <button className="project-empty" onClick={() => newTask(project.id)}>
                            <Plus size={12} />
                            New chat
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                ))}
              </section>
            )}
            <section className="chat-group">
              <div className="sidebar-section">
                <span>{historyView === 'archived' ? 'Archived chats' : 'Recent chats'}</span>
                <DropdownMenuPrimitive.Root>
                  <DropdownMenuPrimitive.Trigger asChild>
                    <button className="icon-button" aria-label="Chat filters">
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
              {recentChats(filteredChats, desktopAvailable, defaultProject).map(chatRow)}
            </section>
            {!filteredChats.length && (
              <p className="empty-history">
                {search
                  ? 'No matching chats.'
                  : historyView === 'archived'
                    ? 'No archived chats.'
                    : 'Start a chat to save your work.'}
              </p>
            )}
          </div>

          <div className="sidebar-bottom">
            <div className="desktop-account-footer">
              <button type="button" className="studio-sidebar-settings" onClick={() => changeSettingsOpen(true)}>
                <Settings2 size={17} />
                Settings<kbd>Ctrl ,</kbd>
              </button>
              <AccountFooter
                authConfigured={authConfigured}
                openConnections={() => setDeviceDialog(true)}
                openArchived={() => setHistoryView(historyView === 'recent' ? 'archived' : 'recent')}
                confirmDeleteAll={() => {
                  setDeletePhrase('');
                  setDeleteAllOpen(true);
                }}
              />
            </div>
          </div>
        </aside>
      )}
      {!left && (
        <nav className="studio-nav-rail" aria-label="Collapsed navigation">
          <button type="button" aria-label="Expand navigation" title="Expand navigation" onClick={toggleLeft}>
            <PanelLeftOpen size={18} />
          </button>
          <button
            type="button"
            aria-label="New chat"
            title="New chat"
            disabled={mediaBusy || actionBusy}
            onClick={() => newTask()}
          >
            <Plus size={19} />
          </button>
          <button type="button" aria-label="Activity" title="Activity" onClick={() => setStudioView('activity')}>
            <Workflow size={18} />
          </button>
          <button
            type="button"
            aria-label="Scheduled tasks"
            title="Scheduled tasks"
            onClick={() => setStudioView('schedules')}
          >
            <Clock3 size={18} />
          </button>
          <button type="button" aria-label="Settings" title="Settings" onClick={() => changeSettingsOpen(true)}>
            <Settings2 size={18} />
          </button>
        </nav>
      )}
    </>
  );
}
