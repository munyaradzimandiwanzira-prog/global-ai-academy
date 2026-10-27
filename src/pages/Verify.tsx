import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX } from 'lucide-react';
import type { Certificate } from '@shared/api-types';
import { api, errorMessage } from '@/lib/api';
import { Input, PageHeader, Spinner } from '@/components/ui';
import { CertificateView } from './student/Certificates';

export default function Verify() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(id ?? '');
  const q = useQuery({ queryKey: ['verify', id], queryFn: () => api.get<{ certificate: Certificate }>(`/api/exams/certificates/verify/${encodeURIComponent(id!)}`), enabled: !!id, retry: false });

  return (
    <div className="container max-w-3xl py-10">
      <PageHeader title="Verify a certificate" description="Employers and schools can confirm that a Global AI Academy certificate is genuine." />
      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) navigate(`/verify/${code.trim().toUpperCase()}`); }} className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. GAA-K7M2-QX9P" aria-label="Certificate code" />
        <button className="btn-primary">Verify</button>
      </form>
      <div className="mt-8">
        {q.isLoading && <Spinner label="Checking…" />}
        {q.error && <p className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950/40 dark:text-red-200"><ShieldX className="h-5 w-5" /> {errorMessage(q.error)}</p>}
        {q.data && (
          <>
            <p className="mb-5 flex items-center gap-2 rounded-xl bg-teal-100 p-4 font-medium text-teal-600"><ShieldCheck className="h-5 w-5" /> Genuine certificate issued to {q.data.certificate.name}.</p>
            <CertificateView cert={q.data.certificate} />
          </>
        )}
      </div>
    </div>
  );
}
