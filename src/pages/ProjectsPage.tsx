import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { compressToEncodedURIComponent } from 'lz-string';
import { Copy, ExternalLink, Link2, Link2Off, Plus, Trash2 } from 'lucide-react';
import type { Project } from '@shared/api-types';
import type { RunLanguage } from '@shared/content';
import { Playground } from '@/features/editor/Playground';
import { LANGUAGE_LABELS } from '@/features/runners';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button, ButtonLink, Empty, IconButton, PageLoader } from '@/components/ui';

const shareUrl = (slug: string) => `${window.location.origin}/p/${slug}`;

export default function ProjectsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['projects'], queryFn: () => api.get<{ projects: Project[]; limit: number; canShare: boolean }>('/api/projects') });

  const update = useMutation({
    mutationFn: async ({ p, shared }: { p: Project; shared: boolean }) => {
      const full = await api.get<{ project: Project }>(`/api/projects/${p.id}`);
      return api.put<{ project: Project }>(`/api/projects/${p.id}`, { title: p.title, language: p.language, code: full.project.code, shared });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (r.project.shareSlug) {
        navigator.clipboard?.writeText(shareUrl(r.project.shareSlug)).catch(() => {});
        toast.success('Share link copied');
      } else toast.success('Project is private again');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <PageLoader />;
  const data = q.data!;

  return (
    <div className="container py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold">My projects</h1>
          <p className="mt-1 text-fg/75 tabular">{data.projects.length} of {data.limit} saved{data.canShare ? '' : ' · sharing by link is part of Plus'}</p>
        </div>
        <ButtonLink to="/playground" startIcon={<Plus />}>New project</ButtonLink>
      </div>

      {data.projects.length === 0 ? (
        <div className="mt-8"><Empty title="No projects yet" action={<ButtonLink to="/playground" color="action">Open the playground</ButtonLink>}>Write something in the playground or any online editor, then press “Save as project”.</Empty></div>
      ) : (
        <table className="mt-8 w-full text-left text-[15px]">
          <thead><tr className="border-b border-border text-fg/70"><th className="py-2 font-medium">Name</th><th className="hidden py-2 font-medium sm:table-cell">Language</th><th className="hidden py-2 font-medium md:table-cell">Updated</th><th className="py-2 text-right font-medium">Actions</th></tr></thead>
          <tbody>
            {data.projects.map((p) => (
              <tr key={p.id} className="border-b border-border">
                <td className="py-3"><Link to={`/playground?project=${p.id}`} className="font-semibold hover:text-teal-600">{p.title}</Link>{p.shareSlug && <span className="ml-2 text-sm text-teal-600">Shared</span>}</td>
                <td className="hidden py-3 sm:table-cell">{LANGUAGE_LABELS[p.language as RunLanguage] ?? p.language}</td>
                <td className="hidden py-3 tabular md:table-cell">{formatDate(p.updatedAt)}</td>
                <td className="py-3">
                  <div className="flex justify-end gap-1">
                    {p.shareSlug && <IconButton size="sm" aria-label="Copy share link" onClick={() => { navigator.clipboard?.writeText(shareUrl(p.shareSlug!)); toast.success('Link copied'); }}><Copy className="h-4 w-4" /></IconButton>}
                    {data.canShare && (
                      <IconButton size="sm" aria-label={p.shareSlug ? 'Stop sharing' : 'Share by link'} onClick={() => update.mutate({ p, shared: !p.shareSlug })}>
                        {p.shareSlug ? <Link2Off className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                      </IconButton>
                    )}
                    <IconButton size="sm" aria-label={`Delete ${p.title}`} onClick={() => { if (window.confirm(`Delete “${p.title}”? This cannot be undone.`)) remove.mutate(p.id); }}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Public, read-only view of a shared project. Anyone can run it or copy it into their own playground. */
export function SharedProjectPage() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['shared', slug], queryFn: () => api.get<{ project: Project }>(`/api/projects/shared/${slug}`), retry: false });
  if (q.isLoading) return <PageLoader />;
  if (q.error || !q.data) {
    return (
      <div className="container py-16">
        <h1 className="display-md">This project is not shared</h1>
        <p className="mt-3 text-fg/80">The link may be wrong, or its owner made it private.</p>
        <ButtonLink to="/playground" className="mt-6">Open the playground</ButtonLink>
      </div>
    );
  }
  const p = q.data.project;
  return (
    <div className="container py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold">{p.title}</h1>
          <p className="mt-1 text-fg/75">{LANGUAGE_LABELS[p.language as RunLanguage] ?? p.language} · by {p.authorName || 'a learner'} · updated {formatDate(p.updatedAt)}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink to={`/playground?lang=${p.language}#code=${compressToEncodedURIComponent(p.code)}`} variant="outlined" startIcon={<ExternalLink />}>Remix in my playground</ButtonLink>
          <Button variant="text" onClick={() => { navigator.clipboard?.writeText(p.code); toast.success('Code copied'); }} startIcon={<Copy />}>Copy code</Button>
        </div>
      </div>
      <div className="mt-6"><Playground language={p.language as RunLanguage} initialCode={p.code} height="460px" autoRun={p.language === 'html' || p.language === 'css'} /></div>
    </div>
  );
}
