import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Field, Input } from '@/components/ui';
import { AuthShell } from './AuthShell';

export default function Reset() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setErrors({ confirm: 'Passwords do not match' });
    setBusy(true);
    setErrors({});
    try {
      await api.post('/api/auth/reset', { token, password });
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fields ?? { _: err.message } : { _: 'Could not reset your password.' });
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Link missing" subtitle="This page needs the link from your reset email.">
        <Link to="/forgot-password" className="btn-primary">Request a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} className="space-y-4">
        {errors._ && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors._} <Link to="/forgot-password" className="underline">Request a new link</Link></p>}
        <Field label="New password" error={errors.password} hint="At least 8 characters, with a letter and a number." htmlFor="pw">
          <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password" error={errors.confirm} htmlFor="pw2">
          <Input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <button disabled={busy} className="btn-primary btn-lg w-full">{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </AuthShell>
  );
}
