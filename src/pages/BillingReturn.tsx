import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Smartphone } from '@/components/icons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { celebrate } from '@/lib/celebrate';
import { Spinner } from '@/components/ui';

export default function BillingReturn() {
  const [params] = useSearchParams();
  const ref = params.get('ref') ?? '';
  const { refresh } = useAuth();
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!ref || status !== 'pending' || tries > 40) return;
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ status: 'pending' | 'paid' | 'failed' }>(`/api/payments/status/${encodeURIComponent(ref)}`);
        if (r.status === 'paid') { setStatus('paid'); celebrate('big'); void refresh(); }
        else if (r.status === 'failed') setStatus('failed');
      } finally {
        setTries((n) => n + 1);
      }
    }, tries === 0 ? 500 : 4000);
    return () => clearTimeout(t);
  }, [ref, status, tries, refresh]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      {status === 'pending' && (
        <>
          <Smartphone className="h-14 w-14 text-gold-600" />
          <h1 className="mt-4 text-3xl font-bold">Waiting for your payment</h1>
          <p className="mt-2 max-w-md text-muted-fg">If you chose EcoCash or OneMoney, check your phone and enter your PIN. This page updates by itself.</p>
          <Spinner className="mt-6" label="Checking with Paynow…" />
          {tries > 40 && <p className="mt-4 text-sm">Still pending? It can take a few minutes. <Link to="/settings" className="text-teal-600 underline">Check your billing history</Link>.</p>}
        </>
      )}
      {status === 'paid' && (
        <>
          <CheckCircle2 className="h-14 w-14 text-teal" />
          <h1 className="mt-4 text-3xl font-bold">Payment received — thank you!</h1>
          <p className="mt-2 text-muted-fg">Your plan is active. Enjoy the AI tutor, goals and certificates.</p>
          <Link to="/dashboard" className="btn-primary mt-6">Go to my learning</Link>
        </>
      )}
      {status === 'failed' && (
        <>
          <XCircle className="h-14 w-14 text-red-500" />
          <h1 className="mt-4 text-3xl font-bold">Payment didn’t go through</h1>
          <p className="mt-2 text-muted-fg">Nothing was charged. You can try again or use a different method.</p>
          <Link to="/pricing" className="btn-primary mt-6">Try again</Link>
        </>
      )}
    </div>
  );
}
