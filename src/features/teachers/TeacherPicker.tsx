import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { InvitePreview, ListedTeacher } from '@shared/teaching';
import { api } from '@/lib/api';
import { Input } from '@/components/ui';
import { Check, Search, X } from '@/components/icons';
import { cn } from '@/lib/utils';

const CODE = /^[A-Za-z0-9-]{4,32}$/;

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Shows whose class an invite code joins, so a learner can check before signing up. */
export function useInvitePreview(code: string) {
  const c = useDebounced(code.trim(), 350);
  return useQuery({
    queryKey: ['invite-preview', c.toUpperCase()],
    enabled: CODE.test(c),
    retry: false,
    staleTime: 60_000,
    queryFn: () => api.get<{ invite: InvitePreview }>(`/api/teach/public/invites/${encodeURIComponent(c)}`).then((r) => r.invite),
  });
}

export function InvitePreviewLine({ code }: { code: string }) {
  const p = useInvitePreview(code);
  if (!CODE.test(code.trim())) return null;
  if (p.isFetching && !p.data) return <p className="mt-1 text-xs text-muted-fg">Checking the code…</p>;
  if (p.isError) return <p className="mt-1 text-xs font-medium text-red-600">That code isn’t working. Check it with your teacher.</p>;
  if (!p.data) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-teal-600">
      <Check className="h-3.5 w-3.5" /> You’ll join {p.data.teacherName}{p.data.school ? ` (${p.data.school})` : ''}{p.data.classroomName ? `, class ${p.data.classroomName}` : ''}.
    </p>
  );
}

/** Search the teachers who chose to be findable, and pick up to `max`. */
export function TeacherSearch({ value, onChange, max = 3, exclude = [] }: { value: ListedTeacher[]; onChange: (v: ListedTeacher[]) => void; max?: number; exclude?: string[] }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const res = useQuery({
    queryKey: ['teacher-search', dq],
    enabled: dq.length >= 2,
    staleTime: 30_000,
    queryFn: () => api.get<{ teachers: ListedTeacher[] }>(`/api/teach/public/teachers?q=${encodeURIComponent(dq)}`).then((r) => r.teachers),
  });
  const chosen = new Set(value.map((t) => t.id));
  const results = (res.data ?? []).filter((t) => !exclude.includes(t.id));
  const full = value.length >= max;
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Teachers you picked">
          {value.map((t) => (
            <li key={t.id} className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-600 dark:bg-teal/20">
              {t.name}
              <button type="button" aria-label={`Remove ${t.name}`} className="rounded-full p-0.5 hover:bg-teal/20" onClick={() => onChange(value.filter((x) => x.id !== t.id))}><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" aria-hidden />
        <Input aria-label="Search for your teacher by name or school" className="pl-9" placeholder={full ? `You can pick up to ${max}` : 'Teacher’s name or school'} disabled={full} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {dq.length >= 2 && !full && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border text-sm" role="listbox" aria-label="Matching teachers">
          {res.isFetching && !res.data ? <li className="px-3 py-2 text-muted-fg">Searching…</li>
            : results.length ? results.map((t) => (
              <li key={t.id} role="option" aria-selected={chosen.has(t.id)}>
                <button type="button" disabled={chosen.has(t.id)} onClick={() => { onChange([...value, t]); setQ(''); }} className={cn('flex w-full flex-col px-3 py-2 text-left hover:bg-muted', chosen.has(t.id) && 'opacity-50')}>
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-fg">{[t.school, t.city].filter(Boolean).join(' · ') || 'Teacher'}</span>
                </button>
              </li>
            )) : <li className="px-3 py-2 text-muted-fg">No teacher found. Ask yours for an invite code.</li>}
        </ul>
      )}
    </div>
  );
}
