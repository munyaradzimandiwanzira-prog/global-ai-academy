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
import { AuthShell } from './AuthShell';

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const { user } = await api.post<{ user: PublicUser }>('/api/auth/login', form);
      setUser(user);
      qc.invalidateQueries({ queryKey: ['progress'] });
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(safeNext(params.get('next'), ROLE_HOME[user.role]), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields ?? { _: err.message });
      else setErrors({ _: 'Could not sign in. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle={<>New here? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-semibold text-teal-600 hover:underline">Create a free account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors._ && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{errors._}</p>}
        <Field label="Email" error={errors.email} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password} htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="flex justify-end text-sm"><Link to="/forgot-password" className="text-teal-600 hover:underline">Forgot password?</Link></div>
        <button disabled={busy} className="btn-primary btn-lg w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
}
