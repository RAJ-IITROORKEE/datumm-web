'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Activity, ArrowLeft, BookOpen, Bot, ChevronRight, Globe, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Plug, Puzzle, ScrollText, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const groups = [
  { label: 'Dashboard', items: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard }] },
  { label: 'Agent', items: [
    { href: '/admin/agent', label: 'Agent', icon: Bot }, { href: '/admin/web-search', label: 'Web search', icon: Globe },
    { href: '/admin/knowledge', label: 'Knowledge', icon: BookOpen }, { href: '/admin/skills', label: 'Skills', icon: Puzzle },
    { href: '/admin/mcp', label: 'MCP servers', icon: Server },
  ] },
  { label: 'Release', items: [{ href: '/admin/plugin', label: 'Plugin', icon: Plug }] },
  { label: 'System', items: [{ href: '/admin/audit', label: 'Audit log', icon: ScrollText }] },
];

function Nav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-2 py-3">
      {groups.map(g => (
        <div key={g.label} className="mb-4">
          <p className={cn('mb-1 px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase', collapsed && 'sr-only')}>{g.label}</p>
          <ul className="grid gap-0.5">
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = path === href;
              return (
                <li key={href}>
                  <Link href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined}
                    className={cn('flex h-9 items-center gap-3 rounded-md px-2.5 text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50', active && 'bg-accent font-medium', collapsed && 'justify-center px-0')}>
                    <Icon className="size-4 shrink-0" aria-hidden /><span className={cn(collapsed && 'sr-only')}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const Brand = ({ collapsed }: { collapsed?: boolean }) => (
  <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4"><Activity className="size-4 shrink-0" aria-hidden /><span className={cn('text-sm font-semibold tracking-wide', collapsed && 'sr-only')}>DATUMM Admin</span></div>
);

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const path = usePathname();
  const current = groups.flatMap(g => g.items).find(i => i.href === path);
  return (
    <div className={cn('flex h-full [--admin-sidebar:0px]', collapsed ? 'md:[--admin-sidebar:3.5rem]' : 'md:[--admin-sidebar:15rem]')}>
      <aside aria-label="Sidebar" className={cn('hidden shrink-0 flex-col border-r bg-card transition-[width] md:flex', collapsed ? 'w-14' : 'w-60')}>
        <Brand collapsed={collapsed} />
        <Nav collapsed={collapsed} />
        <div className="border-t p-2">
          <Button asChild variant="ghost" className={cn('w-full justify-start', collapsed && 'justify-center px-0')}><Link href="/" title="Back to workspace"><ArrowLeft /><span className={cn(collapsed && 'sr-only')}>Back to workspace</span></Link></Button>
        </div>
      </aside>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent>
          <SheetTitle className="sr-only">Admin navigation</SheetTitle><SheetDescription className="sr-only">Sections of the DATUMM admin</SheetDescription>
          <Brand />
          <Nav collapsed={false} onNavigate={() => setSheet(false)} />
          <div className="border-t p-2"><Button asChild variant="ghost" className="w-full justify-start"><Link href="/"><ArrowLeft /> Back to workspace</Link></Button></div>
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => setSheet(true)}><Menu /></Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed} onClick={() => setCollapsed(c => !c)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm">
              <li><Link href="/admin" className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">Admin</Link></li>
              {current && current.href !== '/admin' && <><li aria-hidden><ChevronRight className="size-3.5 text-muted-foreground" /></li><li aria-current="page" className="truncate font-medium">{current.label}</li></>}
            </ol>
          </nav>
          <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:block" title={email}>{email}</span>
        </header>
        <main id="admin-main" className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8"><div className="mx-auto max-w-4xl">{children}</div></main>
      </div>
    </div>
  );
}
