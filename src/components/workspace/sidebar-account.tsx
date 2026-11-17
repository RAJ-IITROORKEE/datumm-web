'use client';

import {
  Archive, ArrowUpRight, CircleHelp, Clock3, LogOut, Monitor, Settings2, Trash2, Workflow,
} from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { useUser, useClerk, Show, SignInButton } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { ChevronDown } from './sidebar-icons';
import { Avatar } from '@/components/vendor/affectui/avatar-clean';
import {
  ProfileIdentity, ProfileMenuStyles, profileMenuClasses,
} from '@/components/vendor/affectui/profile-menu-clean';
import { Separator } from '@/components/ui/separator';
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
  const item = profileMenuClasses.item;
  const avatar = (
    <Avatar kind="person" size={24} name={name} src={user?.imageUrl} aria-hidden="true" />
  );
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button type="button" className={cn(styles.profileRow, compact && styles.compactProfile)}
          aria-label={`Account settings for ${name}`} title={compact ? name : undefined}>
          {avatar}
          {!compact && <>
            <span className={styles.profileName} title={name} dir="auto">{name}</span>
            <ChevronDown size={13} strokeWidth={1.9} aria-hidden="true" />
          </>}
        </button>
      </DropdownMenuPrimitive.Trigger>
      <ProfileMenuStyles />
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={cn(profileMenuClasses.content, styles.accountMenu)}
          side={compact ? "right" : "top"} align="end" sideOffset={9}>
          <ProfileIdentity name={name} avatar={avatar}
            email={user?.primaryEmailAddress?.emailAddress} />
          <div className={profileMenuClasses.items}>
            {openActivity && <DropdownMenuPrimitive.Item className={item} onSelect={openActivity}>
              <Workflow size={15} strokeWidth={1.9} /> Activity
            </DropdownMenuPrimitive.Item>}
            {openSchedules && <DropdownMenuPrimitive.Item className={item} onSelect={openSchedules}>
              <Clock3 size={15} strokeWidth={1.9} /> Scheduled tasks
            </DropdownMenuPrimitive.Item>}
            <DropdownMenuPrimitive.Item className={item} onSelect={openSettings}>
              <Settings2 size={15} strokeWidth={1.9} /> Settings
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item className={item} onSelect={openArchived}>
              <Archive size={15} /> Archived chats
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item className={item} onSelect={openConnections}>
              <Monitor size={15} /> Connections
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Separator asChild><Separator /></DropdownMenuPrimitive.Separator>
            <DropdownMenuPrimitive.Item className={cn(item, styles.danger)}
              onSelect={confirmDeleteAll}>
              <Trash2 size={15} /> Delete all chats
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item className={item} onSelect={() => void signOut()}>
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
      <div className={cn(styles.profileRow, compact && styles.compactProfile)}
        title="Sign-in unavailable" aria-label="Sign-in unavailable">
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
          <button type="button" className={cn(styles.signIn, compact && styles.compactProfile)}
            aria-label="Sign in to DATUMM" title={compact ? "Sign in to DATUMM" : undefined}>
            {!compact && "Sign in to DATUMM"} <ArrowUpRight size={15} />
          </button>
        </SignInButton>
      </Show>
    </>
  );
}
