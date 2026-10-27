import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar, Empty, PageHeader, PageLoader } from '@/components/ui';
import { rankForXp } from '@shared/config';
import { cn } from '@/lib/utils';

interface Leader { name: string; city: string | null; avatarColor: string; xp: number; isMe: boolean }

export default function Leaderboard() {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const { data, isLoading } = useQuery({ queryKey: ['leaders', scope], queryFn: () => api.get<{ leaders: Leader[] }>(`/api/leaderboard?scope=${scope}`) });
  return (
    <div className="container max-w-3xl py-10">
      <PageHeader title="Leaderboard" description="XP comes from finishing lessons, exercises, challenges, exams and assignments." />
      <div className="mb-6 inline-flex rounded-full border border-border p-1">
        {(['week', 'all'] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)} className={cn('rounded-full px-4 py-1.5 text-sm font-medium', scope === s ? 'bg-ink text-white dark:bg-gold dark:text-ink' : '')}>{s === 'week' ? 'This week' : 'All time'}</button>
        ))}
      </div>
      {isLoading ? <PageLoader /> : !data?.leaders.length ? (
        <Empty icon={<Trophy className="h-10 w-10" />} title="The board is empty">Finish a lesson to be the first name here.</Empty>
      ) : (
        <ol className="card divide-y divide-border overflow-hidden">
          {data.leaders.map((l, i) => (
            <li key={i} className={cn('flex items-center gap-4 px-5 py-3', l.isMe && 'bg-gold-100/60 dark:bg-night-700')}>
              <span className={cn('w-7 text-center font-display text-lg font-bold', i === 0 ? 'text-gold-600' : i === 1 ? 'text-ink/60 dark:text-sand/70' : i === 2 ? 'text-stone' : 'text-muted-fg')}>{i + 1}</span>
              <Avatar name={l.name} color={l.avatarColor} />
              <div className="flex-1">
                <div className="font-medium">{l.name}{l.isMe && <span className="ml-2 chip bg-teal-100 text-teal-600">You</span>}</div>
                <div className="text-xs text-muted-fg">{[l.city, rankForXp(l.xp).name].filter(Boolean).join(' · ')}</div>
              </div>
              <span className="font-semibold tabular-nums">{l.xp.toLocaleString()} XP</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
