import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PublicUser } from '@shared/api-types';
import { ROLE_HOME } from '@shared/rbac';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeNext } from '@/lib/utils';
import { Field, Input } from '@/components/ui';
import { useTurnstile } from '@/components/Turnstile';
import { AuthShell } from './AuthShell';

type LoginResponse = { user: PublicUser } | { mfaRequired: true; challenge: string };

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const bot = useTurnstile('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const finish = (user: PublicUser, usedRecoveryCode?: boolean) => {
    setUser(user);
    qc.invalidateQueries({ queryKey: ['progress'] });
    toast.success(`Welcome back, ${user.name.split(' ')[0]}!`, usedRecoveryCode ? { description: 'You used a recovery code. Make new ones in Settings → Two-step login.' } : undefined);
    navigate(safeNext(params.get('next'), ROLE_HOME[user.role]), { replace: true });
  };

  const fail = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) setErrors(err.fields ?? { _: err.message });
    else setErrors({ _: fallback });
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const r = await api.post<LoginResponse>('/api/auth/login', { ...form, turnstileToken: bot.token });
      if ('mfaRequired' in r) {
        setChallenge(r.challenge);
        setCode('');
      } else finish(r.user);
    } catch (err) {
      fail(err, 'Could not sign in. Try again.');
      bot.reset();
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setErrors({});
    try {
      const r = await api.post<{ user: PublicUser; usedRecoveryCode: boolean }>('/api/auth/mfa/verify', { challenge, code });
      finish(r.user, r.usedRecoveryCode);
    } catch (err) {
      // An expired ticket means starting again from the password step.
      if (err instanceof ApiError && err.status === 401) {
        setChallenge(null);
        setForm((f) => ({ ...f, password: '' }));
      }
      fail(err, 'Could not check that code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const alert = errors._ && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{errors._}</p>;

  if (challenge) {
    return (
      <AuthShell title="Enter your code" subtitle="Open your authenticator app and type the 6-digit code for Global AI Academy.">
        <form onSubmit={submitCode} className="space-y-4" noValidate>
          {alert}
          <Field label="6-digit code or recovery code" error={errors.code} hint="Lost your phone? Use one of the recovery codes you saved, like ABCD-EF23." htmlFor="code">
            <Input
              id="code"
              autoFocus
              required
              autoComplete="one-time-code"
              inputMode="text"
              spellCheck={false}
              maxLength={12}
              className="font-mono text-lg tracking-[0.2em]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <button disabled={busy || code.trim().length < 6} className="btn-primary btn-lg w-full">{busy ? 'Checking…' : 'Verify and sign in'}</button>
          <button type="button" className="btn-ghost w-full" onClick={() => { setChallenge(null); setErrors({}); }}>Use a different account</button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle={<>New here? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-semibold text-teal-600 hover:underline">Create a free account</Link></>}>
      <form onSubmit={submitPassword} className="space-y-4" noValidate>
        {alert}
        <Field label="Email" error={errors.email} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password} htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="flex justify-end text-sm"><Link to="/forgot-password" className="text-teal-600 hover:underline">Forgot password?</Link></div>
        {bot.widget}
        {errors.turnstile && <p className="text-xs font-medium text-red-600">{errors.turnstile}</p>}
        <button disabled={busy} className="btn-primary btn-lg w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
}
