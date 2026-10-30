import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from '@/components/icons';
import { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { zuvaApi } from '@/features/zuva/api';

const KIND_LABEL: Record<string, string> = { preference: 'Preference', goal: 'Goal', interest: 'Interest', strength: 'Strength', struggle: 'Working on', progress: 'Progress', fact: 'Note' };

/** Settings → What Zuva remembers. Learners (and parents of child accounts) can see, delete or switch off memory. */
export function ZuvaMemorySettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['zuva-me'], queryFn: zuvaApi.me });
  const refresh = () => qc.invalidateQueries({ queryKey: ['zuva-me'] });
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); await refresh(); } catch (e) { toast.error(errorMessage(e)); } };
  const p = q.data?.profile;

  return (
    <section id="zuva" className="card scroll-mt-24 p-6" aria-labelledby="zuva-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="zuva-heading" className="font-display text-xl font-semibold">What Zuva remembers</h2>
        {p && <span className="text-sm font-semibold text-muted-fg">Memory {p.memoryEnabled ? 'on' : 'off'}</span>}
      </div>
      <p className="mt-2 max-w-prose text-sm text-muted-fg">
        Zuva, the AI tutor, can remember learning things you mention, like favourite topics, goals or what you find tricky, so it can help you better next time.
        It never stores contact details, passwords, school, location or family details, and for children it stores even less. Conversations are deleted after 90 days without use.
      </p>
      {q.isLoading && <p className="mt-4 text-sm">Loading…</p>}
      {p && (
        <>
          <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[#23807F]" checked={p.memoryEnabled} onChange={(e) => void run(() => zuvaApi.setMemory(e.target.checked), e.target.checked ? 'Zuva will remember learning things again.' : 'Memory switched off and cleared.')} />
            Let Zuva remember learning things about me
          </label>
          {(p.interests.length > 0 || p.goals.length > 0 || p.learningStyle) && (
            <div className="mt-4 text-sm">
              {p.interests.length > 0 && <p><b>Interests:</b> {p.interests.join(', ')}</p>}
              {p.goals.length > 0 && <p><b>Goals:</b> {p.goals.join(', ')}</p>}
              {p.learningStyle && <p><b>Learns best:</b> {p.learningStyle}</p>}
            </div>
          )}
          {q.data!.memories.length ? (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {q.data!.memories.map((m) => (
                <li key={m.id} className="flex items-start gap-3 p-3 text-sm">
                  <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{KIND_LABEL[m.kind] ?? m.kind}</span>
                  <span className="min-w-0 flex-1">{m.content}<span className="block text-xs text-muted-fg">Saved {formatDate(m.createdAt)}{m.source === 'user' ? ' · you asked' : ''}</span></span>
                  <button type="button" onClick={() => void run(() => zuvaApi.forget(m.id), 'Forgotten.')} className="rounded p-1.5 text-muted-fg hover:bg-muted hover:text-fg" aria-label={`Forget: ${m.content}`}><Trash2 /></button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-fg">Nothing remembered yet.</p>
          )}
          <button type="button" className="btn-outline btn-sm mt-4" onClick={() => { if (window.confirm('Forget everything Zuva remembers, including past conversations?')) void run(zuvaApi.forgetAll, 'Zuva has forgotten everything.'); }}>Forget everything</button>
        </>
      )}
    </section>
  );
}
