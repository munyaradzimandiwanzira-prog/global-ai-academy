import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from '@/components/icons';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const [state, setState] = useState<'busy' | 'ok' | 'error'>('busy');
  const [message, setMessage] = useState('');
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    api.post('/api/auth/verify-email', { token: params.get('token') ?? '' })
      .then(() => { setState('ok'); void refresh(); })
      .catch((e) => { setState('error'); setMessage(errorMessage(e)); });
  }, [params, refresh]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      {state === 'busy' && <Spinner label="Confirming your email…" />}
      {state === 'ok' && (
        <>
          <CheckCircle2 className="h-14 w-14 text-teal" />
          <h1 className="mt-4 text-3xl font-bold">Email confirmed</h1>
          <p className="mt-2 text-muted-fg">You’re all set. Your progress and certificates are linked to this email.</p>
          <Link to="/dashboard" className="btn-primary mt-6">Go to my learning</Link>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="h-14 w-14 text-red-500" />
          <h1 className="mt-4 text-3xl font-bold">We couldn’t confirm that link</h1>
          <p className="mt-2 max-w-md text-muted-fg">{message}</p>
          <Link to="/settings" className="btn-primary mt-6">Send a new link from Settings</Link>
        </>
      )}
    </div>
  );
}
