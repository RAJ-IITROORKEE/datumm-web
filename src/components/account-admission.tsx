'use client';

import { Button } from '@/components/ui/button';
import type { AuthStatus } from '@/lib/desktop-contract';
import { DesktopTitlebar } from './desktop-titlebar';
import styles from './account-admission.module.css';

export function accountAdmissionState(desktopAvailable: boolean, desktopPreview: boolean, status: AuthStatus | undefined, workspaceSubject: string | undefined) {
  const localTest = status?.localTest === true && status.kind === 'fixture-auth';
  const admittedSubject = localTest ? 'local-test-profile' : status && (status.state === 'signed-in' || status.state === 'expired-offline') ? status.subject : undefined;
  return {
    localTest,
    admittedSubject,
    needsAccountAdmission: desktopAvailable && !desktopPreview && !localTest && (!admittedSubject || workspaceSubject !== admittedSubject),
    workspaceLoading: Boolean(admittedSubject && workspaceSubject !== admittedSubject),
  };
}

export function AccountAdmission({ status, statusError, actionError, busy, workspaceLoading, onSignIn, onCancel, onRetry }: {
  status?: AuthStatus;
  statusError?: string;
  actionError?: string;
  busy: boolean;
  workspaceLoading?: boolean;
  onSignIn: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const fixture = status?.kind === 'fixture-auth';

  return <div className={styles.window}>
    <DesktopTitlebar left={true} right={true} onSettings={() => {}} onToggleLeft={() => {}} onToggleRight={() => {}} title="DATUMM account" nativeAvailable/>
    <main className={`auth-shell ${styles.screen}`} aria-labelledby="account-admission-title">
      <section className="auth-card">
        <div className="auth-brand"><img src="/datumm-mark.png" alt=""/><span>DATUMM</span></div>
        <h1 id="account-admission-title">{workspaceLoading ? 'Loading your workspace' : fixture ? 'Local test sign-in' : 'Sign in to DATUMM'}</h1>
        <p>{workspaceLoading
          ? 'Checking your saved account data before opening the workspace.'
          : fixture
            ? 'This explicit test account uses an isolated local profile. It does not sign you into a hosted DATUMM account.'
            : 'Use your DATUMM account to open this desktop workspace. AI provider access and Revit connection are managed separately.'}</p>

        {fixture && !workspaceLoading && <div className="auth-device" role="note"><strong>LOCAL TEST BUILD</strong><p>Test fixture sign-in stays separate from hosted account admission.</p></div>}
        {workspaceLoading
          ? <div className="auth-device" role="status" aria-live="polite">Loading saved work for this account…</div>
          : status?.state === 'pending'
            ? <div className="auth-device" role="status" aria-live="polite"><strong>Waiting for sign-in in your browser</strong><p>DATUMM will open the workspace after it validates the account session.</p></div>
            : !status && !statusError
              ? <div className="auth-device" role="status" aria-live="polite">Checking your DATUMM account…</div>
              : status?.kind === 'unconfigured'
                ? <div className="auth-device" role="status"><strong>Sign-in is unavailable in this build</strong><p>A hosted DATUMM account service is not configured.</p></div>
                : status?.state === 'signed-out'
                  ? <div className="auth-device" role="status">You are signed out of your DATUMM account.</div>
                  : null}

        {status?.error && <p className="error-banner" role="alert">{status.error}</p>}
        {actionError && <p className="error-banner" role="alert">{actionError}</p>}
        {statusError && <p className="error-banner" role="alert">{statusError}</p>}

        {status?.state === 'pending' && !workspaceLoading && <Button variant="secondary" disabled={busy} onClick={onCancel}>{busy ? 'Canceling…' : 'Cancel sign-in'}</Button>}
        {status?.state === 'signed-out' && status.kind !== 'unconfigured' && !workspaceLoading && <Button size="lg" disabled={busy} onClick={onSignIn}>{busy ? 'Opening browser…' : fixture ? 'Sign in to test account' : 'Sign in to DATUMM'}</Button>}
        {statusError && <Button variant="secondary" disabled={busy} onClick={onRetry}>Retry status check</Button>}
      </section>
    </main>
  </div>;
}
