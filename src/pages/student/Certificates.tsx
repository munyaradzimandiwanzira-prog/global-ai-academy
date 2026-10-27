import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Printer, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { Certificate } from '@shared/api-types';
import { api } from '@/lib/api';
import { catalog } from '@/lib/catalog';
import { Empty, PageHeader, PageLoader, TrackMark } from '@/components/ui';
import { LogoMark } from '@/components/ui/Logo';
import { formatDate } from '@/lib/utils';

export function CertificateView({ cert }: { cert: Certificate }) {
  const verifyUrl = `${location.origin}/verify/${cert.id}`;
  return (
    <div className="certificate relative mx-auto aspect-[1.414] w-full max-w-3xl overflow-hidden rounded-xl border-[10px] border-ink bg-[#FBF8F2] p-[5%] text-ink shadow-lift print:shadow-none">
      <div className="absolute inset-x-0 top-0 chevron-band" />
      <div className="absolute inset-x-0 bottom-0 chevron-band" />
      <div className="flex h-full flex-col items-center justify-between text-center">
        <div className="flex items-center gap-2"><LogoMark className="h-10 w-10" /><span className="font-display text-xl font-bold">Global AI Academy</span></div>
        <div>
          <p className="text-[clamp(10px,1.6vw,14px)] uppercase tracking-[0.3em] text-stone">Certificate of achievement</p>
          <p className="mt-[3%] text-[clamp(11px,1.8vw,16px)] text-ink/70">This certifies that</p>
          <p className="mt-1 font-display text-[clamp(22px,5vw,48px)] font-bold italic">{cert.name}</p>
          <p className="mt-1 text-[clamp(11px,1.8vw,16px)] text-ink/70">has successfully completed the certification exam for</p>
          <p className="mt-1 font-display text-[clamp(16px,3.4vw,30px)] font-semibold text-teal-600">{cert.trackTitle}</p>
          <p className="mt-1 text-[clamp(10px,1.5vw,14px)] text-ink/60">with a score of {Math.round(cert.score)}%</p>
        </div>
        <div className="flex w-full items-end justify-between text-left text-[clamp(9px,1.3vw,12px)] text-ink/60">
          <div>Issued {formatDate(cert.issuedAt)}<br />Harare, Zimbabwe</div>
          <div className="text-right">Verify at<br /><span className="font-mono text-ink">{verifyUrl.replace(/^https?:\/\//, '')}</span></div>
        </div>
      </div>
    </div>
  );
}

export default function Certificates() {
  const { data, isLoading } = useQuery({ queryKey: ['certs'], queryFn: () => api.get<{ certificates: Certificate[] }>('/api/exams/certificates/mine') });
  if (isLoading) return <PageLoader />;
  const certs = data?.certificates ?? [];
  const examTracks = catalog.filter((t) => t.quizCount >= 5).slice(0, 8);

  return (
    <div className="container py-10">
      <PageHeader title="Certificates" description="Pass a track’s certification exam with 70% or more to earn a certificate. Every certificate has a public verification link for your CV or LinkedIn." />
      {certs.length === 0 ? (
        <Empty icon={<Award className="h-10 w-10" />} title="No certificates yet" action={<Link to="/tutorials" className="btn-primary">Find a track</Link>}>
          Complete most of a track, then take its exam. Exams are part of Plus and Academy.
        </Empty>
      ) : (
        <div className="space-y-10">
          {certs.map((c) => (
            <div key={c.id}>
              <CertificateView cert={c} />
              <div className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2 print:hidden">
                <button onClick={() => window.print()} className="btn-outline btn-sm"><Printer className="h-4 w-4" /> Print or save as PDF</button>
                <button onClick={() => { void navigator.clipboard.writeText(`${location.origin}/verify/${c.id}`); toast.success('Verification link copied'); }} className="btn-outline btn-sm"><Copy className="h-4 w-4" /> Copy verification link</button>
                <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(c.trackTitle)}&organizationName=Global%20AI%20Academy&certId=${c.id}&certUrl=${encodeURIComponent(`${location.origin}/verify/${c.id}`)}`} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">Add to LinkedIn</a>
              </div>
            </div>
          ))}
        </div>
      )}
      <section className="mt-14 print:hidden">
        <h2 className="text-2xl font-bold">Available exams</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {examTracks.map((t) => (
            <Link key={t.id} to={`/exam/${t.id}`} className="card flex items-center gap-3 p-4 hover:border-teal/50">
              <TrackMark short={t.short} color={t.color} size={40} />
              <span className="font-medium">{t.title} exam</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
