import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LearnerAnnouncement } from '@shared/messages';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Empty, PageHeader, PageLoader } from '@/components/ui';
import { MaterialIcon } from '@/components/icons';
import { shortDate } from '@/pages/teacher/shared';

/** Announcements from a learner's teachers. Opening the page marks them read. */
export default function Inbox() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['inbox'], queryFn: () => api.get<{ announcements: LearnerAnnouncement[]; unread: number }>('/api/messages/inbox') });
  const read = useMutation({ mutationFn: () => api.post('/api/messages/inbox/read', {}), onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const unread = q.data?.unread ?? 0;
  useEffect(() => { if (unread > 0) read.mutate(); }, [unread]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.isLoading) return <PageLoader />;
  const list = q.data?.announcements ?? [];
  return (
    <div className="container max-w-3xl py-8">
      <PageHeader title="Messages from your teachers" />
      {!list.length ? <Empty icon={<MaterialIcon name="campaign" className="text-[40px]" />} title="No messages yet">When a teacher sends your class an announcement, it appears here.</Empty> : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id} className={cn('card p-5', !a.read && 'border-l-4 border-l-gold')}>
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-lg font-semibold">{!a.read && <span className="sr-only">New: </span>}{a.title}</h2><span className="text-sm text-muted-fg">{shortDate(a.createdAt)}</span></div>
              <p className="text-sm text-muted-fg">From {a.teacher}</p>
              <p className="mt-2 whitespace-pre-line text-[16px]">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
