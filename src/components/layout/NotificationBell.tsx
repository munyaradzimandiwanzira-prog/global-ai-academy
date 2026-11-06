import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationItem } from '@shared/teaching';
import { api } from '@/lib/api';
import { Bell } from '@/components/icons';
import { cn, timeAgo } from '@/lib/utils';

/** Header bell: new work, marks, teacher news. Polls gently while the tab is open. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: NotificationItem[]; unread: number }>('/api/notifications'),
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
  const read = useMutation({ mutationFn: (id: string) => api.post(`/api/notifications/${id}/read`), onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const readAll = useMutation({ mutationFn: () => api.post('/api/notifications/read-all'), onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];
  const go = (n: NotificationItem) => {
    if (!n.read) read.mutate(n.id);
    setOpen(false);
    if (n.link.startsWith('/')) navigate(n.link);
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-icon relative text-fg/70 hover:bg-fg/[.07] hover:text-fg" aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'} aria-expanded={open} aria-haspopup="dialog">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-card p-2 shadow-float">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && <button type="button" className="text-xs font-medium text-teal-600 hover:underline" onClick={() => readAll.mutate()}>Mark all read</button>}
          </div>
          {items.length ? (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => go(n)} className={cn('flex w-full gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-muted', !n.read && 'bg-teal-100/40 dark:bg-teal/10')}>
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-teal')} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      {n.body && <span className="line-clamp-2 block text-xs text-muted-fg">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-muted-fg">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="px-3 py-6 text-center text-sm text-muted-fg">You’re all caught up.</p>}
        </div>
      )}
    </div>
  );
}
