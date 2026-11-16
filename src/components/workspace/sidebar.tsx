'use client';

import { useEffect, useRef, useState } from 'react';
import { filterSidebarChats, isSidebarSearchShortcut, pinnedChats, recentChats } from '@/lib/sidebar-history.mjs';
import { cn } from '@/lib/utils';
import {
  CircleHelp,
  Archive,
  Trash2,
  Plus,
  Clock3,
  Workflow,
  Pencil,
  Check,
  Settings2,
  Monitor,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import { Pin, Ellipsis, FolderOpen, PanelLeft, Search, Folder, PanelLeftOpen, ChevronDown, SquarePen, LayoutGrid } from './sidebar-icons';
import { workflowState } from '@/lib/workflow-state';
import { ChatRow } from './chat-row';
import { ProjectCreate } from './project-create';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import type { WorkScope } from '@/lib/work-area-contract';
import { ShareDialog } from './share-dialog';
import { useUser, useClerk, Show, SignInButton } from '@clerk/nextjs';
import { type WorkspaceState, type Run } from './use-workspace-state';
import { IconButton } from '@/components/vendor/affectui/icon-button-clean';
import { Avatar } from '@/components/vendor/affectui/avatar-clean';
import { ProfileIdentity, ProfileMenuStyles, profileMenuClasses } from '@/components/vendor/affectui/profile-menu-clean';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchDialog, type SearchNavigation, type SearchResult } from './search-dialog';
import { ProjectOverview } from './project-overview';
import styles from './sidebar.module.css';

export function ProfileMenu({
  openConnections,
  openSettings,
  openArchived,
  confirmDeleteAll,
  openActivity,
  openSchedules,
  compact = false,
}: {
  openConnections: () => void;
  openSettings: () => void;
  openArchived: () => void;
  confirmDeleteAll: () => void;
  openActivity?: () => void;
  openSchedules?: () => void;
  compact?: boolean;
}) {
  const { user } = useUser(),
    { signOut } = useClerk();
  const name = user?.fullName || user?.firstName || user?.username || 'Your account';
  return (
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button type="button" className={cn(styles.profileRow, compact && styles.compactProfile)} aria-label={`Account settings for ${name}`} title={compact ? name : undefined}>
            <Avatar kind="person" size={24} name={name} src={user?.imageUrl} aria-hidden="true" />
            {!compact && <><span className={styles.profileName} title={name} dir="auto">{name}</span>
            <ChevronDown size={13} strokeWidth={1.9} aria-hidden="true" /></>}
          </button>
        </DropdownMenuPrimitive.Trigger>
        <ProfileMenuStyles />
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content className={cn(profileMenuClasses.content, styles.accountMenu)} side={compact ? "right" : "top"} align="end" sideOffset={9}>
            <ProfileIdentity name={name} email={user?.primaryEmailAddress?.emailAddress}
              avatar={<Avatar kind="person" size={24} name={name} src={user?.imageUrl} aria-hidden="true" />} />
            <div className={profileMenuClasses.items}>
            {openActivity && <DropdownMenuPrimitive.Item className={profileMenuClasses.item} onSelect={openActivity}>
              <Workflow size={15} strokeWidth={1.9} /> Activity
            </DropdownMenuPrimitive.Item>}
            {openSchedules && <DropdownMenuPrimitive.Item className={profileMenuClasses.item} onSelect={openSchedules}>
              <Clock3 size={15} strokeWidth={1.9} /> Scheduled tasks
            </DropdownMenuPrimitive.Item>}
            <DropdownMenuPrimitive.Item className={profileMenuClasses.item} onSelect={openSettings}>
              <Settings2 size={15} strokeWidth={1.9} /> Settings
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item className={profileMenuClasses.item} onSelect={openArchived}>
              <Archive size={15} /> Archived chats
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item className={profileMenuClasses.item} onSelect={openConnections}>
              <Monitor size={15} /> Connections
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Separator asChild><Separator /></DropdownMenuPrimitive.Separator>
            <DropdownMenuPrimitive.Item className={cn(profileMenuClasses.item, styles.danger)} onSelect={confirmDeleteAll}>
              <Trash2 size={15} /> Delete all chats
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item className={profileMenuClasses.item} onSelect={() => void signOut()}>
              <LogOut size={15} /> Sign out
            </DropdownMenuPrimitive.Item>
            </div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
  );
}

export function AccountFooter({
  authConfigured,
  openConnections,
  openSettings,
  openArchived,
  confirmDeleteAll,
  openActivity,
  openSchedules,
  compact = false,
}: {
  authConfigured: boolean;
  openConnections: () => void;
  openSettings: () => void;
  openArchived: () => void;
  confirmDeleteAll: () => void;
  openActivity?: () => void;
  openSchedules?: () => void;
  compact?: boolean;
}) {
  if (!authConfigured)
    return (
      <div className={cn(styles.profileRow, compact && styles.compactProfile)} title="Sign-in unavailable" aria-label="Sign-in unavailable">
        <CircleHelp size={18} />
        {!compact && <span>Sign-in unavailable</span>}
      </div>
    );
  return (
    <>
      <Show when="signed-in">
        <ProfileMenu
          openActivity={openActivity}
          openSchedules={openSchedules}
          compact={compact}
          openConnections={openConnections}
          openSettings={openSettings}
          openArchived={openArchived}
          confirmDeleteAll={confirmDeleteAll}
        />
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className={cn(styles.signIn, compact && styles.compactProfile)} aria-label="Sign in to DATUMM" title={compact ? "Sign in to DATUMM" : undefined}>
            {!compact && "Sign in to DATUMM"} <ArrowUpRight size={15} />
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
  | 'toggleLeft'
  | 'newTask'
  | 'search'
  | 'setSearch'
  | 'studioView'
  | 'openStudioView'
  | 'runs'
  | 'historyView'
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
  | 'projectsSupported'
  | 'chatMenuUnsupported'
  | 'unreadIds'
  | 'renameChat'
  | 'moveChat'
  | 'createProject'
  | 'archiveProject'
  | 'projects'
  | 'workspaceReady'
  | 'serviceError'
> & { scope: WorkScope; navigationRail?: boolean; externalBackdrop?: boolean };

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
    toggleLeft,
    newTask,
    search,
    setSearch,
    studioView,
    openStudioView,
    runs,
    historyView,
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
    projectsSupported,
    chatMenuUnsupported,
    unreadIds,
    renameChat,
    moveChat,
    createProject,
    archiveProject,
    projects,
    workspaceReady,
    serviceError,
    scope,
    navigationRail = false,
    externalBackdrop = false,
  } = props;
  const [projectFilter, setProjectFilter] = useState<{accountKey: string; projectId: string | null}>({accountKey: scope.accountKey, projectId: null});
  // A navigation filter must never carry over to a different signed-in account.
  if (projectFilter.accountKey !== scope.accountKey) setProjectFilter({accountKey: scope.accountKey, projectId: null});
  const selectedProject = projectFilter.accountKey === scope.accountKey
    ? orderedProjects.find(project => project.id === projectFilter.projectId) : undefined;
  const selectProjectFilter = (projectId: string | null) => {
    setProjectFilter({accountKey: scope.accountKey, projectId});
    if (projectId && collapsedProjects.includes(projectId)) setCollapsedProjects(collapsedProjects.filter(id => id !== projectId));
  };
  const pendingNewProject = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [overviewId, setOverviewId] = useState<string | null>(null);
  const pendingOverview = useRef<string | null>(null);
  const searchOpener = useRef<HTMLElement | null>(null);
  const projectSection = useRef<HTMLElement | null>(null);
  const [shareSelection, setShareSelection] = useState<{taskId: string; title: string; scope: WorkScope; openId: number} | null>(null);
  const [shareUnsupported, setShareUnsupported] = useState<string | null>(null);
  const shareOpenId = useRef(0);
  const shareOpener = useRef<HTMLElement | null>(null);
  const share = shareSelection && shareSelection.scope.key === scope.key && shareSelection.scope.epoch === scope.epoch ? shareSelection : null;
  const liveShare = useRef(share); liveShare.current = share;
  const ownsShare = (selection: NonNullable<typeof share>) => liveShare.current?.openId === selection.openId && liveShare.current.scope.key === selection.scope.key && liveShare.current.scope.epoch === selection.scope.epoch;
  const openSearch = (opener: HTMLElement | null) => {
    searchOpener.current = opener;
    setSearchOpen(true);
  };
  const changeSearchOpen = (open: boolean) => {
    setSearchOpen(open);
    if (!open) setSearch('');
  };
  const restoreNavigationFocus = (opening: boolean) => requestAnimationFrame(() => {
    const labels = opening ? '[aria-label="Collapse navigation"],[aria-label="Close chat list"]' : '[aria-label="Chats"], [aria-label="Open workspace navigation"], [aria-label="Expand navigation"], [aria-label="Show sidebar"]';
    Array.from(document.querySelectorAll<HTMLButtonElement>(labels))
      .find(button => button.getClientRects().length > 0)?.focus();
  });
  const collapseNavigation = () => { setLeft(false); restoreNavigationFocus(false); };
  const expandNavigation = () => { toggleLeft(); restoreNavigationFocus(true); };
  const focusProjects = () => {
    projectSection.current?.scrollIntoView({ block: 'nearest' });
    projectSection.current?.focus({ preventScroll: true });
  };
  const captureDialogOpener = () => {
    const active = document.activeElement;
    dialogTrigger.current = active instanceof HTMLElement && active.closest('[role="menu"]')
      ? Array.from(document.querySelectorAll<HTMLElement>('[aria-haspopup="menu"][data-state="open"]')).find(element => element.getClientRects().length > 0) ?? null
      : active instanceof HTMLElement ? active : null;
  };
  const openConnections = () => { captureDialogOpener(); setDeviceDialog(true); };
  const confirmDeleteAll = () => { captureDialogOpener(); setDeletePhrase(''); setDeleteAllOpen(true); };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const editing = Boolean(target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'));
      const higherDialog = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="menu"]'))
        .some(dialog => dialog.id !== 'workspace-navigation' && dialog.getClientRects().length > 0);
      if (!isSidebarSearchShortcut(event, editing, higherDialog)) return;
      event.preventDefault();
      openSearch(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  const showProjects = desktopAvailable || projectsSupported,
    hosted = !desktopAvailable;
  const movable = hosted && projectsSupported && !chatMenuUnsupported.includes('move') && historyView !== 'archived';
  const chatRow = (item: Run) => (
    <ChatRow
      key={item.id}
      item={item}
      selected={runId === item.id}
      busy={mediaBusy || actionBusy}
      unread={unreadIds.has(item.id)}
      dialogTrigger={dialogTrigger}
      onSelect={() => selectRun(item)}
      onHistory={(action) => void updateHistory(item, action)}
      onDelete={() => {
        dialogTrigger.current = document.querySelector<HTMLButtonElement>(`button[data-run-id="${item.id}"]`);
        setDeleteTarget(item);
      }}
      onProjects={() => {
        selectRun(item);
        setProjectContextOpen(true);
      }}
      onShare={hosted && authConfigured && workspaceReady && shareUnsupported !== scope.accountKey ? () => {
        shareOpener.current = dialogTrigger.current;
        setShareSelection({taskId: item.id, title: item.title, scope, openId: ++shareOpenId.current});
      } : undefined}
      onRename={chatMenuUnsupported.includes('rename') ? undefined : (title) => renameChat(item, title)}
      moveTargets={movable ? projects.filter((project) => !project.archived_at) : undefined}
      onMove={movable ? (projectId) => void moveChat(item, projectId) : undefined}
    />
  );
  const knownProjectIds = new Set(projects.map((project) => project.id));
  const visibleChats = filterSidebarChats(runs, projects, search).filter(item => !selectedProject || item.projectId === selectedProject.id).filter(item =>
    !workflowFilter || workflowState(item).kind === workflowFilter && !item.data.organized_done);
  const navigation: SearchNavigation[] = [
    { id: 'new', title: 'New chat', disabled: mediaBusy || actionBusy || Boolean(selectedProject?.archived_at), onSelect: () => newTask(selectedProject?.id) },
    { id: 'schedules', title: 'Scheduled tasks', onSelect: () => openStudioView('schedules') },
    { id: 'activity', title: 'Activity', onSelect: () => openStudioView('activity') },
    { id: 'settings', title: 'Settings', onSelect: () => changeSettingsOpen(true) },
    { id: 'projects', title: 'Projects & local files', onSelect: () => setProjectContextOpen(true) },
    { id: 'connections', title: 'Connections', onSelect: openConnections },
    { id: 'archive', title: historyView === 'archived' ? 'Recent chats' : 'Archived chats',
      onSelect: () => setHistoryView(historyView === 'recent' ? 'archived' : 'recent') },
  ];
  const canCreateProject = showProjects && hosted && workspaceReady && historyView !== 'archived' && !chatMenuUnsupported.includes('projects');
  const activateSearch = (result: SearchResult) => {
    if ((mediaBusy || actionBusy) && result.kind !== 'navigation') return;
    if (result.kind === 'chat') {
      const item = runs.find(item => item.id === result.id);
      if (item) {
        if (selectedProject && item.projectId !== selectedProject.id) selectProjectFilter(null);
        selectRun(item);
      }
    } else if (result.kind === 'project') {
      const project = projects.find(item => item.id === result.id && !item.archived_at);
      if (project) newTask(project.id);
    } else navigation.find(item => item.id === result.id && !item.disabled)?.onSelect();
  };
  return (
    <>
      {share && <ShareDialog key={JSON.stringify([share.scope.key, share.scope.epoch, share.openId])}
        taskId={share.taskId} title={share.title} opener={shareOpener}
        onClose={() => { if (ownsShare(share)) setShareSelection(null); }}
        onUnsupported={() => { if (ownsShare(share)) { setShareUnsupported(share.scope.accountKey); setShareSelection(null); } }} />}
      <SearchDialog open={searchOpen} onOpenChange={changeSearchOpen} query={search} onQueryChange={setSearch}
        chats={runs} projects={showProjects ? projects : []}
        navigation={navigation} loading={!workspaceReady} error={serviceError} busy={mediaBusy || actionBusy}
        opener={searchOpener} onActivate={activateSearch} />
      <ProjectOverview project={projects.find(project => project.id === overviewId) ?? null} chats={runs}
        historyView={historyView} busy={mediaBusy || actionBusy} opener={dialogTrigger}
        onClose={() => setOverviewId(null)} onSelect={selectRun} onNewChat={newTask} />
      {left && viewportReady && !navigationRail && !externalBackdrop && (
        <button type="button" className="sidebar-backdrop" aria-label="Close task navigation" onClick={collapseNavigation} />
      )}
      {left && (
        <aside id="workspace-sidebar" className={cn('sidebar', styles.sidebar, navigationRail && styles.withRail)}>
          {navigationRail && <div className={styles.projectHeader}>
            <DropdownMenuPrimitive.Root>
              <DropdownMenuPrimitive.Trigger asChild>
                <button type="button" className={styles.projectSwitcher} aria-label={`Filter projects: ${selectedProject?.title ?? 'All projects'}`}>
                  <span dir="auto" title={selectedProject?.title ?? 'All projects'}>{selectedProject?.title ?? 'All projects'}</span>
                  <ChevronDown size={13} strokeWidth={1.9} aria-hidden="true" />
                </button>
              </DropdownMenuPrimitive.Trigger>
              <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content className={cn('action-menu', styles.projectSwitcherMenu)} align="start" sideOffset={6}
                  onCloseAutoFocus={event => {
                    if (!pendingNewProject.current) return;
                    event.preventDefault();
                    pendingNewProject.current = false;
                    // Let the menu release focus before opening the existing inline creator.
                    requestAnimationFrame(() => {
                      focusProjects();
                      projectSection.current?.querySelector<HTMLButtonElement>('button[aria-label="New project"]')?.click();
                    });
                  }}>
                  <DropdownMenuPrimitive.RadioGroup value={selectedProject?.id ?? ''} onValueChange={id => selectProjectFilter(id || null)}>
                    <DropdownMenuPrimitive.RadioItem value="">
                      <FolderOpen size={15} strokeWidth={1.9} /> All projects
                      {!selectedProject && <Check size={14} className={styles.selectionCheck} />}
                    </DropdownMenuPrimitive.RadioItem>
                    {showProjects && orderedProjects.map(project => <DropdownMenuPrimitive.RadioItem key={project.id} value={project.id}>
                      <Folder size={15} strokeWidth={1.9} /><span className={styles.switcherProjectTitle} dir="auto">{project.title}</span>
                      {selectedProject?.id === project.id && <Check size={14} className={styles.selectionCheck} />}
                    </DropdownMenuPrimitive.RadioItem>)}
                  </DropdownMenuPrimitive.RadioGroup>
                  {!workspaceReady && <DropdownMenuPrimitive.Item disabled>Loading projects…</DropdownMenuPrimitive.Item>}
                  {workspaceReady && !showProjects && <DropdownMenuPrimitive.Item disabled>Projects are unavailable on this service.</DropdownMenuPrimitive.Item>}
                  {workspaceReady && showProjects && !orderedProjects.length && <DropdownMenuPrimitive.Item disabled>{serviceError ? 'Projects could not refresh.' : 'No projects yet.'}</DropdownMenuPrimitive.Item>}
                  {canCreateProject && <><DropdownMenuPrimitive.Separator /><DropdownMenuPrimitive.Item disabled={mediaBusy || actionBusy}
                    onSelect={() => { pendingNewProject.current = true; }}><Plus size={15} strokeWidth={1.9} /> New project</DropdownMenuPrimitive.Item></>}
                  {showProjects && !hosted && <><DropdownMenuPrimitive.Separator /><DropdownMenuPrimitive.Item onSelect={() => setProjectContextOpen(true)}>
                    <FolderOpen size={15} /> Projects & local files
                  </DropdownMenuPrimitive.Item></>}
                </DropdownMenuPrimitive.Content>
              </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <IconButton label="Search chats and projects" title="" className={styles.headerSearch} icon={<Search size={16} strokeWidth={1.9} />}
                aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" onClick={event => openSearch(event.currentTarget)} />
            </TooltipTrigger><TooltipContent side="right">Search chats and projects <kbd>Ctrl K</kbd></TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <IconButton className={styles.headerSearch} label="Close chat list" title="" icon={<PanelLeft size={16} strokeWidth={1.9} />}
                aria-controls="workspace-sidebar" aria-expanded={true} onClick={collapseNavigation} />
            </TooltipTrigger><TooltipContent side="right">Close chat list</TooltipContent></Tooltip></TooltipProvider>
          </div>}
          {!navigationRail && <><div className={styles.brandRow}>
            <div className={styles.workspaceBrand} aria-label="DATUMM">
              <img src="/datumm-mark.png" className={styles.workspaceLogo} width={22} height={22} alt="" />
              <span className={styles.brand}>DATUMM</span>
            </div>
            <IconButton className={styles.collapseButton} label="Collapse navigation" title="Collapse navigation" icon={<PanelLeft size={16} strokeWidth={1.9} />} aria-controls="workspace-sidebar" aria-expanded={true} onClick={collapseNavigation} />
          </div>

          <button type="button" className={cn(styles.navRow, styles.search)} aria-label="Search chats and projects"
            aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" onClick={event => openSearch(event.currentTarget)}>
            <Search size={15} strokeWidth={1.9} /><span>Search…</span><kbd>Ctrl K</kbd>
          </button>
          </>}
          <nav className={styles.navigation} aria-label="Workspace views">
            <button type="button" className={styles.navRow} aria-current={!runId && studioView === 'workspace' ? 'page' : undefined}
              onClick={() => newTask(selectedProject?.id)} disabled={mediaBusy || actionBusy || Boolean(selectedProject?.archived_at)}>
              <SquarePen size={16} strokeWidth={1.9} /><span>New chat</span>
            </button>
            {!navigationRail && <><button
              type="button"
              className={styles.navRow}
              aria-controls="sidebar-projects"
              onClick={focusProjects}
            >
              <Folder size={16} strokeWidth={1.9} />
              Projects
            </button>
            <button
              type="button"
              className={styles.navRow}
              onClick={openConnections}
            >
              <LayoutGrid size={16} strokeWidth={1.9} />
              Connections
            </button></>}
          </nav>

          <div
            className={styles.history}
            role="region"
            aria-label={historyView === 'archived' ? 'Archived chats' : 'Recent tasks'}
            tabIndex={0}
          >
            {visibleChats.some((item) => item.pinned_at) && (
              <section className={styles.chatGroup}>
                <div className={styles.sectionHeading}>
                  <Pin size={13} />
                  <span>Pinned</span>
                </div>
                {pinnedChats(visibleChats).map(chatRow)}
              </section>
            )}
              <section id="sidebar-projects" ref={projectSection} tabIndex={-1} className={styles.projectGroups} aria-label="Projects">
                <div className={styles.sectionHeading}>
                  <FolderOpen size={13} />
                  <span>Projects</span>
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
                {workspaceReady && !showProjects && <p className={styles.empty} role="status">Projects are unavailable on this service.</p>}
                {workspaceReady && showProjects && !orderedProjects.length && <p className={styles.empty} role="status">
                  {serviceError ? 'Projects could not refresh. Retry the workspace connection.' : 'No projects yet.'}
                </p>}
                {showProjects && orderedProjects.filter(project => !selectedProject || project.id === selectedProject.id).map((project) => (
                  <section key={project.id} className={styles.projectGroup}>
                    <div className={styles.projectHeading}>
                      <button
                        className={styles.projectToggle}
                        aria-expanded={!collapsedProjects.includes(project.id) || Boolean(search)}
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
                        {(!collapsedProjects.includes(project.id) || Boolean(search)) && <ChevronDown size={12} strokeWidth={1.9} aria-hidden="true" />}
                      </button>
                      <DropdownMenuPrimitive.Root>
                        <DropdownMenuPrimitive.Trigger asChild>
                          <button type="button" disabled={mediaBusy || actionBusy} className={cn(styles.smallButton, styles.projectMenu)} aria-label={`Options for project ${project.title}`}
                            onClick={event => { dialogTrigger.current = event.currentTarget; }}>
                            <Ellipsis size={15} strokeWidth={1.9} />
                          </button>
                        </DropdownMenuPrimitive.Trigger>
                        <DropdownMenuPrimitive.Portal>
                          <DropdownMenuPrimitive.Content className="action-menu" onCloseAutoFocus={event => {
                            if (pendingOverview.current !== project.id) return;
                            event.preventDefault();
                            pendingOverview.current = null;
                            setOverviewId(project.id);
                          }}>
                            <DropdownMenuPrimitive.Item onSelect={() => { pendingOverview.current = project.id; }}>
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
                                  ...orderedProjects.filter((row) => row.id !== project.id).map((row) => row.id),
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
                    {(!collapsedProjects.includes(project.id) || Boolean(search)) && (
                      <div className={styles.projectChats}>
                        {visibleChats.filter((item) => item.projectId === project.id && !item.pinned_at).map(chatRow)}
                        {!visibleChats.some((item) => item.projectId === project.id) && (
                          <button type="button" className={styles.projectEmpty} disabled={mediaBusy || actionBusy || Boolean(project.archived_at)} onClick={() => newTask(project.id)}>
                            <Plus size={12} />
                            New chat
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                ))}
              </section>
            {(!selectedProject || recentChats(visibleChats, showProjects, defaultProject, knownProjectIds).length > 0) && <section className={styles.chatGroup}>
              <div className={styles.sectionHeading}>
                <span>{historyView === 'archived' ? 'Archived chats' : 'Chats'}</span>
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
              {recentChats(visibleChats, showProjects, defaultProject, knownProjectIds).map(chatRow)}
            </section>}
            {!visibleChats.length && (
              <p className={styles.empty}>
                {!workspaceReady ? 'Loading chat history...' : serviceError ? 'History could not refresh. Retry the workspace connection.' : search
                  ? 'No matching chats.'
                  : historyView === 'archived'
                    ? 'No archived chats.'
                    : selectedProject ? 'No chats in this project yet.' : 'Start a chat to save your work.'}
              </p>
            )}
          </div>

          {!navigationRail && <div className={styles.bottom}>
            <div className={styles.footer}>
              <AccountFooter
                authConfigured={authConfigured}
                openActivity={() => openStudioView('activity')}
                openSchedules={() => openStudioView('schedules')}
                openSettings={() => changeSettingsOpen(true)}
                openConnections={openConnections}
                openArchived={() => setHistoryView(historyView === 'recent' ? 'archived' : 'recent')}
                confirmDeleteAll={confirmDeleteAll}
              />
            </div>
          </div>}
        </aside>
      )}
      {!left && !navigationRail && (
        <nav className={cn('studio-nav-rail', styles.rail)} aria-label="Collapsed navigation">
          <img src="/datumm-mark.png" className={styles.workspaceLogo} width={22} height={22} alt="DATUMM" />
          <button type="button" aria-label="Expand navigation" title="Expand navigation" aria-controls="workspace-sidebar" aria-expanded={false} onClick={expandNavigation}>
            <PanelLeftOpen size={18} />
          </button>
          <button type="button" aria-label="Search chats and projects" title="Search chats and projects" aria-haspopup="dialog" onClick={event => openSearch(event.currentTarget)}><Search size={16} /></button>
          <button
            type="button"
            aria-label="New chat"
            title="New chat"
            disabled={mediaBusy || actionBusy}
            onClick={() => newTask(selectedProject?.id)}
          >
            <SquarePen size={16} strokeWidth={1.9} />
          </button>
          <button type="button" aria-label="Projects" title="Projects" aria-controls="sidebar-projects" onClick={() => { setLeft(true); requestAnimationFrame(focusProjects); }}><Folder size={16} /></button>
          <button type="button" aria-label="Connections" title="Connections" onClick={openConnections}><LayoutGrid size={16} /></button>
          {showProjects && orderedProjects.map(project => <button key={project.id} type="button" aria-label={`Open project ${project.title}`} title={project.title}
            onClick={() => { selectProjectFilter(project.id); setLeft(true); requestAnimationFrame(focusProjects); }}><Folder size={16} /></button>)}
          <button type="button" aria-label="Activity" title="Activity" onClick={() => openStudioView('activity')}>
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
          <button type="button" aria-label="Settings" title="Settings" onClick={() => changeSettingsOpen(true)}>
            <Settings2 size={18} />
          </button>
          <div className={styles.railAccount}><AccountFooter compact authConfigured={authConfigured} openActivity={() => openStudioView('activity')} openSchedules={() => openStudioView('schedules')} openSettings={() => changeSettingsOpen(true)} openConnections={openConnections}
            openArchived={() => { setHistoryView('archived'); setLeft(true); }} confirmDeleteAll={confirmDeleteAll} /></div>
        </nav>
      )}
    </>
  );
}
