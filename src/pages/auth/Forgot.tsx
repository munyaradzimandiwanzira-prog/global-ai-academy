import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '@/lib/api';
import { Field, Input } from '@/components/ui';
import { AuthShell } from './AuthShell';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [devUrl, setDevUrl] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    setError('');
    try {
      const r = await api.post<{ devResetUrl?: string }>('/api/auth/forgot', { email });
      setDevUrl(r.devResetUrl);
      setState('sent');
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter the email you signed up with and we’ll send you a reset link.">
      {state === 'sent' ? (
        <div className="card p-5">
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-fg">If an account exists for {email}, a reset link is on its way. It expires in 1 hour.</p>
          {devUrl && <a href={devUrl} className="mt-3 block break-all text-sm text-teal-600 underline">Dev mode: open reset link</a>}
          <Link to="/login" className="btn-outline mt-4">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" error={error} htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button disabled={state === 'busy'} className="btn-primary btn-lg w-full">{state === 'busy' ? 'Sending…' : 'Send reset link'}</button>
          <p className="text-center text-sm"><Link to="/login" className="text-teal-600 hover:underline">Back to sign in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
