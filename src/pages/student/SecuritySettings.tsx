import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AccountSession, MfaStatus, PublicUser } from '@shared/api-types';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Field, Input } from '@/components/ui';
import { QrCode } from '@/components/QrCode';
import { formatDate } from '@/lib/utils';

/** Settings → Security: two-step login, signed-in devices, download or delete your data. */
export function SecuritySettings() {
  return (
    <>
      <TwoStepLogin />
      <Devices />
      <YourData />
    </>
  );
}

const fieldErrors = (err: unknown) => (err instanceof ApiError && err.fields ? err.fields : {});

// ── Two-step login ─────────────────────────────────────────────────────────

type Stage =
  | { kind: 'idle' }
  | { kind: 'password' }
  | { kind: 'scan'; secret: string; otpauthUrl: string }
  | { kind: 'codes'; codes: string[] }
  | { kind: 'disable' }
  | { kind: 'regenerate' };

function TwoStepLogin() {
  const { setUser, user } = useAuth();
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['mfa'], queryFn: () => api.get<MfaStatus>('/api/account/mfa') });
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const s = status.data;
  if (!s || !s.available) return null;

  const reset = () => { setPassword(''); setCode(''); setErrors({}); };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErrors({});
    try { await fn(); } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const start = (e: React.FormEvent) => { e.preventDefault(); void act(async () => {
    const r = await api.post<{ secret: string; otpauthUrl: string }>('/api/account/mfa/setup', { password });
    reset();
    setStage({ kind: 'scan', ...r });
  }); };

  const enable = (e: React.FormEvent) => { e.preventDefault(); void act(async () => {
    const r = await api.post<{ recoveryCodes: string[]; user: PublicUser }>('/api/account/mfa/enable', { code });
    reset();
    setStage({ kind: 'codes', codes: r.recoveryCodes });
    setUser({ ...r.user, pendingTeacherRequest: user?.pendingTeacherRequest });
    await qc.invalidateQueries({ queryKey: ['mfa'] });
    await qc.invalidateQueries({ queryKey: ['me'] });
    toast.success('Two-step login is on. Other devices were signed out.');
  }); };

  const disable = (e: React.FormEvent) => { e.preventDefault(); void act(async () => {
    const r = await api.post<{ user: PublicUser }>('/api/account/mfa/disable', { password, code });
    reset();
    setStage({ kind: 'idle' });
    setUser({ ...r.user, pendingTeacherRequest: user?.pendingTeacherRequest });
    await qc.invalidateQueries({ queryKey: ['mfa'] });
    toast.success('Two-step login is off.');
  }); };

  const regenerate = (e: React.FormEvent) => { e.preventDefault(); void act(async () => {
    const r = await api.post<{ recoveryCodes: string[] }>('/api/account/mfa/recovery-codes', { code });
    reset();
    setStage({ kind: 'codes', codes: r.recoveryCodes });
    await qc.invalidateQueries({ queryKey: ['mfa'] });
  }); };

  const cancel = <button type="button" className="btn-ghost" onClick={() => { reset(); setStage({ kind: 'idle' }); }}>Cancel</button>;

  return (
    <section id="security" className="card scroll-mt-24 p-6" aria-labelledby="mfa-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="mfa-heading" className="font-display text-xl font-semibold">Two-step login</h2>
        <span className={s.enabled ? 'text-sm font-semibold text-teal-700 dark:text-teal-300' : 'text-sm font-semibold text-muted-fg'}>{s.enabled ? `On since ${formatDate(s.enabledAt!)}` : 'Off'}</span>
      </div>
      <p className="mt-2 max-w-prose text-sm text-muted-fg">
        After your password, we ask for a 6-digit code from an authenticator app on your phone (Google Authenticator, Microsoft Authenticator or Authy). A stolen password alone is then not enough to get in.
        {s.required && <strong className="font-semibold text-fg"> Admin accounts must use it.</strong>}
      </p>

      {stage.kind === 'idle' && !s.enabled && <button className="btn-primary mt-4" onClick={() => setStage({ kind: 'password' })}>Turn on two-step login</button>}
      {stage.kind === 'idle' && s.enabled && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm">{s.recoveryCodesLeft} of 10 recovery codes left.</p>
          <button className="btn-outline btn-sm" onClick={() => setStage({ kind: 'regenerate' })}>Make new recovery codes</button>
          {!s.required && <button className="btn-ghost btn-sm" onClick={() => setStage({ kind: 'disable' })}>Turn off</button>}
        </div>
      )}

      {stage.kind === 'password' && (
        <form onSubmit={start} className="mt-4 max-w-sm space-y-3">
          <Field label="Confirm your password" error={errors.password} htmlFor="mfa-pw">
            <Input id="mfa-pw" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="flex gap-2"><button disabled={busy || !password} className="btn-primary">Continue</button>{cancel}</div>
        </form>
      )}

      {stage.kind === 'scan' && (
        <form onSubmit={enable} className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <div className="justify-self-start rounded-xl border border-border bg-white p-2">
            <QrCode value={stage.otpauthUrl} label="QR code to add Global AI Academy to your authenticator app" />
          </div>
          <ol className="space-y-3 text-sm">
            <li><strong>1. Scan the code</strong> with your authenticator app (tap “+” or “Add account”).</li>
            <li>
              <strong>2. Can’t scan?</strong> Choose “Enter a setup key” and type:
              <code className="mt-1 block w-fit select-all rounded-md bg-muted px-2 py-1 font-mono text-sm tracking-wider">{stage.secret}</code>
            </li>
            <li>
              <strong>3. Type the 6-digit code</strong> the app shows:
              <div className="mt-2 flex max-w-xs gap-2">
                <Input aria-label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus className="font-mono tracking-[0.2em]" value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!errors.code} />
                <button disabled={busy || code.replace(/\s/g, '').length !== 6} className="btn-primary shrink-0">Turn on</button>
              </div>
              {errors.code && <p className="mt-1 text-xs font-medium text-red-600">{errors.code}</p>}
            </li>
            <li>{cancel}</li>
          </ol>
        </form>
      )}

      {stage.kind === 'codes' && <RecoveryCodes codes={stage.codes} onDone={() => setStage({ kind: 'idle' })} />}

      {(stage.kind === 'disable' || stage.kind === 'regenerate') && (
        <form onSubmit={stage.kind === 'disable' ? disable : regenerate} className="mt-4 grid max-w-lg gap-3 sm:grid-cols-2">
          {stage.kind === 'disable' && (
            <Field label="Password" error={errors.password} htmlFor="mfa-off-pw">
              <Input id="mfa-off-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          )}
          <Field label="Code from your app" error={errors.code} htmlFor="mfa-off-code">
            <Input id="mfa-off-code" inputMode="numeric" autoComplete="one-time-code" maxLength={12} className="font-mono" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={busy} className={stage.kind === 'disable' ? 'btn-outline' : 'btn-primary'}>{stage.kind === 'disable' ? 'Turn off two-step login' : 'Make new codes'}</button>
            {cancel}
          </div>
        </form>
      )}
    </section>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = `Global AI Academy recovery codes (each works once)\n\n${codes.join('\n')}\n`;
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'global-ai-academy-recovery-codes.txt' });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mt-5 rounded-xl border border-gold/50 bg-gold/10 p-5">
      <h3 className="font-semibold">Save your recovery codes now</h3>
      <p className="mt-1 max-w-prose text-sm">If you lose your phone, each code lets you sign in once. This is the only time we show them. Print them or keep them in a password manager — not in your email.</p>
      <ul className="mt-4 grid max-w-md grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-base tracking-wider" aria-label="Recovery codes">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-outline btn-sm" onClick={download}>Download as a text file</button>
        <button type="button" className="btn-outline btn-sm" onClick={() => void navigator.clipboard.writeText(text).then(() => toast.success('Copied'))}>Copy</button>
        <button type="button" className="btn-primary btn-sm" onClick={onDone}>I’ve saved them</button>
      </div>
    </div>
  );
}

// ── Signed-in devices ──────────────────────────────────────────────────────

/** "Chrome on Android" from a user-agent string; good enough to recognise your own devices. */
function describeAgent(ua: string): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone or iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'unknown system';
  return `${browser} on ${os}`;
}

function Devices() {
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<{ sessions: AccountSession[] }>('/api/account/sessions') });
  const list = sessions.data?.sessions ?? [];
  const others = list.filter((x) => !x.current).length;

  const signOut = async (id: string) => {
    try { await api.del(`/api/account/sessions/${id}`); await qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Device signed out'); } catch (err) { toast.error(errorMessage(err)); }
  };
  const signOutOthers = async () => {
    try { await api.post('/api/account/sessions/sign-out-others'); await qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Signed out of every other device'); } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <section className="card p-6" aria-labelledby="devices-heading">
      <h2 id="devices-heading" className="font-display text-xl font-semibold">Where you’re signed in</h2>
      {sessions.isLoading ? <p className="mt-3 text-sm text-muted-fg">Loading…</p> : (
        <ul className="mt-3 divide-y divide-border">
          {list.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="text-sm font-medium">{describeAgent(d.userAgent)}{d.current && <span className="ml-2 text-xs font-semibold text-teal-700 dark:text-teal-300">This device</span>}</p>
                <p className="text-xs text-muted-fg">Signed in {formatDate(d.createdAt)}</p>
              </div>
              {!d.current && <button className="btn-ghost btn-sm" onClick={() => void signOut(d.id)}>Sign out</button>}
            </li>
          ))}
        </ul>
      )}
      {others > 0 && <button className="btn-outline btn-sm mt-3" onClick={() => void signOutOthers()}>Sign out of all other devices</button>}
    </section>
  );
}

// ── Your data ──────────────────────────────────────────────────────────────

function YourData() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const mfa = useQuery({ queryKey: ['mfa'], queryFn: () => api.get<MfaStatus>('/api/account/mfa') });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ password: '', code: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.post('/api/account/delete', { ...form, code: form.code || undefined });
      await logout().catch(() => {});
      toast.success('Your account and learning data have been deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-6" aria-labelledby="data-heading">
      <h2 id="data-heading" className="font-display text-xl font-semibold">Your data</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-fg">Download everything we hold about you — profile, progress, code, submissions, certificates and payments — as one file.</p>
      <a href="/api/account/export" download className="btn-outline btn-sm mt-3">Download my data</a>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-semibold text-red-700 dark:text-red-300">Delete my account</h3>
        <p className="mt-1 max-w-prose text-sm text-muted-fg">Deletes your profile, progress, projects, submissions and certificates for good. Payment records are kept without your name, because the law requires us to keep them.</p>
        {user.role === 'admin' ? (
          <p className="mt-3 text-sm">Admin accounts can’t be deleted here. Ask another admin to remove your admin access first.</p>
        ) : !open ? (
          <button className="btn-outline btn-sm mt-3 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => setOpen(true)}>Delete my account…</button>
        ) : (
          <form onSubmit={remove} className="mt-4 grid max-w-lg gap-3 sm:grid-cols-2">
            <Field label="Password" error={errors.password} htmlFor="del-pw">
              <Input id="del-pw" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            {mfa.data?.enabled && (
              <Field label="Code from your app" error={errors.code} htmlFor="del-code">
                <Input id="del-code" inputMode="numeric" autoComplete="one-time-code" maxLength={12} className="font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </Field>
            )}
            <Field label="Type DELETE to confirm" error={errors.confirm} htmlFor="del-confirm">
              <Input id="del-confirm" autoComplete="off" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <button disabled={busy || form.confirm !== 'DELETE' || !form.password} className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{busy ? 'Deleting…' : 'Delete everything'}</button>
              <button type="button" className="btn-ghost" onClick={() => { setOpen(false); setErrors({}); }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
