'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowLeft, BookOpen, Bot, ChevronRight, Globe, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Plug, Puzzle, ScrollText, Server, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const groups = [
  { label: 'Workspace', items: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard }] },
  { label: 'Agent', items: [
    { href: '/admin/agent', label: 'Agent', icon: Bot }, { href: '/admin/web-search', label: 'Web search', icon: Globe },
    { href: '/admin/knowledge', label: 'Knowledge', icon: BookOpen }, { href: '/admin/skills', label: 'Skills', icon: Puzzle },
    { href: '/admin/mcp', label: 'MCP servers', icon: Server },
  ] },
  { label: 'Release', items: [{ href: '/admin/plugin', label: 'Plugin', icon: Plug }] },
  { label: 'System', items: [{ href: '/admin/audit', label: 'Audit log', icon: ScrollText }] },
];

function Nav({ collapsed, path, onNavigate }: { collapsed: boolean; path: string; onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void }) {
  return (
    <nav aria-label="Admin sections" className="admin-nav">
      {groups.map(group => (
        <div key={group.label} className="admin-nav-group">
          <p className={cn('admin-nav-label', collapsed && 'sr-only')}>{group.label}</p>
          <ul className="admin-nav-list">
            {group.items.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} onClick={event => onNavigate(event, href)} aria-current={path === href ? 'page' : undefined} title={collapsed ? label : undefined} className="admin-nav-link">
                  <Icon aria-hidden /><span className={cn(collapsed && 'sr-only')}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="admin-brand">
      <img src="/datumm-mark.png" className="admin-brand-mark" alt="" aria-hidden />
      <div className={cn('admin-brand-copy', collapsed && 'sr-only')}><strong>DATUMM</strong><span>Administration</span></div>
    </div>
  );
}

function SidebarFooter({ collapsed = false, email }: { collapsed?: boolean; email: string }) {
  return (
    <div className="admin-sidebar-footer">
      <Link href="/" className="admin-nav-link admin-workspace-link" title={collapsed ? 'Back to workspace' : undefined}>
        <ArrowLeft aria-hidden /><span className={cn(collapsed && 'sr-only')}>Back to workspace</span>
      </Link>
      <div className="admin-identity" title={email}>
        <span className="admin-identity-icon"><UserRound aria-hidden /></span>
        <div className={cn('admin-identity-copy', collapsed && 'sr-only')}><span>Administrator</span><small>{email}</small></div>
      </div>
    </div>
  );
}

export function AdminShell({ email, children, activePath, onNavigate }: {
  email: string;
  children: ReactNode;
  activePath?: string;
  onNavigate?: (href: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const path = activePath ?? pathname;
  const current = groups.flatMap(group => group.items).find(item => item.href === path);
  const navigate = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      event.preventDefault();
      onNavigate(href);
    }
    setSheet(false);
  };

  return (
    <div className={cn('admin-shell', collapsed && 'admin-shell-collapsed')}>
      <a href="#admin-main" className="admin-skip-link">Skip to admin content</a>
      <aside id="admin-sidebar" aria-label="Administration navigation" className="admin-sidebar">
        <Brand collapsed={collapsed} />
        <Nav collapsed={collapsed} path={path} onNavigate={navigate} />
        <SidebarFooter collapsed={collapsed} email={email} />
      </aside>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent className="admin-root admin-navigation-drawer" onCloseAutoFocus={event => { event.preventDefault(); menuTrigger.current?.focus(); }}>
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <SheetDescription className="sr-only">Navigate DATUMM administration or return to your workspace.</SheetDescription>
          <div className="admin-drawer-heading"><Brand /><SheetClose asChild><Button variant="ghost" size="icon" className="admin-shell-button" aria-label="Close navigation"><X /></Button></SheetClose></div>
          <Nav collapsed={false} path={path} onNavigate={navigate} />
          <SidebarFooter email={email} />
        </SheetContent>
      </Sheet>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <Button ref={menuTrigger} variant="ghost" size="icon" className="admin-shell-button admin-mobile-menu" aria-label="Open admin navigation" aria-expanded={sheet} onClick={() => setSheet(true)}><Menu /></Button>
          <Button variant="ghost" size="icon" className="admin-shell-button admin-desktop-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-controls="admin-sidebar" aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
          <nav aria-label="Breadcrumb" className="admin-breadcrumb">
            <ol>
              <li><Link href="/admin" onClick={event => navigate(event, '/admin')} aria-current={current?.href === '/admin' ? 'page' : undefined}>Admin</Link></li>
              {current && current.href !== '/admin' && <><li aria-hidden><ChevronRight /></li><li aria-current="page" className="admin-current-section">{current.label}</li></>}
            </ol>
          </nav>
        </header>
        <main id="admin-main" tabIndex={-1} className="admin-main"><div className="admin-content">{children}</div></main>
      </div>
    </div>
  );
}
