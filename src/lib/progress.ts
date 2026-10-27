import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ActivityRow, ProgressRow } from '@shared/api-types';
import { api } from './api';
import { useAuth, ME_KEY } from './auth';
import { storage } from './utils';
import { celebrate } from './celebrate';

/**
 * Progress works for everyone:
 *  - Guests: stored in localStorage so the free tier "just works" without an account.
 *  - Signed-in learners: stored in D1; local guest progress is merged on first sign-in.
 */

interface LocalProgress {
  progress: ProgressRow[];
  activity: ActivityRow[];
}

const local = storage<LocalProgress>('gaa:progress:v1', { progress: [], activity: [] });
export const PROGRESS_KEY = ['progress'] as const;

type ActivityInput = { kind: ActivityRow['kind']; refId: string; trackId?: string; passed: boolean; score?: number; code?: string };

export function useProgress() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [...PROGRESS_KEY, user?.id ?? 'guest'],
    queryFn: async (): Promise<LocalProgress> => (user ? api.get<LocalProgress>('/api/me/progress') : local.get()),
    staleTime: 30_000,
  });

  // One-time merge of guest progress into a new/returning account.
  const merged = useRef(false);
  useEffect(() => {
    if (!user || merged.current) return;
    merged.current = true;
    const pending = local.get();
    if (!pending.progress.length && !pending.activity.length) return;
    (async () => {
      for (const p of pending.progress) await api.post('/api/me/progress', { trackId: p.trackId, lessonSlug: p.lessonSlug, status: p.status }).catch(() => {});
      for (const a of pending.activity) await api.post('/api/me/activity', { kind: a.kind, refId: a.refId, trackId: a.trackId ?? undefined, passed: a.passed, score: a.score ?? undefined }).catch(() => {});
      local.set({ progress: [], activity: [] });
      qc.invalidateQueries({ queryKey: PROGRESS_KEY });
      qc.invalidateQueries({ queryKey: ME_KEY });
      toast.success('Your guest progress was saved to your account.');
    })();
  }, [user, qc]);

  const data = query.data ?? { progress: [], activity: [] };

  const completed = useMemo(() => new Set(data.progress.filter((p) => p.status === 'completed').map((p) => `${p.trackId}/${p.lessonSlug}`)), [data.progress]);
  const passed = useMemo(() => new Set(data.activity.filter((a) => a.passed).map((a) => `${a.kind}:${a.refId}`)), [data.activity]);

  const lessonMutation = useMutation({
    mutationFn: async (input: { trackId: string; lessonSlug: string; status: 'started' | 'completed' }) => {
      if (user) return api.post<{ xpAwarded: number }>('/api/me/progress', input);
      const state = local.get();
      const now = new Date().toISOString();
      const existing = state.progress.find((p) => p.trackId === input.trackId && p.lessonSlug === input.lessonSlug);
      if (existing) {
        if (existing.status !== 'completed') existing.status = input.status;
        existing.updatedAt = now;
      } else state.progress.push({ ...input, updatedAt: now });
      local.set(state);
      return { xpAwarded: 0 };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: PROGRESS_KEY });
      if (r.xpAwarded) qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });

  const activityMutation = useMutation({
    mutationFn: async (input: ActivityInput) => {
      if (user) return api.post<{ xpAwarded: number }>('/api/me/activity', input);
      const state = local.get();
      const existing = state.activity.find((a) => a.kind === input.kind && a.refId === input.refId);
      const now = new Date().toISOString();
      if (existing) {
        existing.passed = existing.passed || input.passed;
        existing.attempts += 1;
        existing.updatedAt = now;
      } else state.activity.push({ kind: input.kind, refId: input.refId, trackId: input.trackId ?? null, passed: input.passed, score: input.score ?? null, attempts: 1, updatedAt: now });
      local.set(state);
      return { xpAwarded: 0 };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: PROGRESS_KEY });
      if (r.xpAwarded) {
        qc.invalidateQueries({ queryKey: ME_KEY });
        toast.success(`+${r.xpAwarded} XP`, { duration: 1800 });
      }
    },
  });

  const markLesson = useCallback(
    (trackId: string, lessonSlug: string, status: 'started' | 'completed') => {
      const key = `${trackId}/${lessonSlug}`;
      if (status === 'completed' && completed.has(key)) return;
      lessonMutation.mutate({ trackId, lessonSlug, status }, {
        onSuccess: (r) => {
          if (status === 'completed') {
            celebrate('small');
            if (r.xpAwarded) toast.success(`Lesson complete · +${r.xpAwarded} XP`);
          }
        },
      });
    },
    [completed, lessonMutation],
  );

  const recordActivity = useCallback((input: ActivityInput) => activityMutation.mutate(input), [activityMutation]);

  const trackProgress = useCallback(
    (trackId: string, totalLessons: number) => {
      const done = data.progress.filter((p) => p.trackId === trackId && p.status === 'completed').length;
      return { done, total: totalLessons, percent: totalLessons ? Math.round((done / totalLessons) * 100) : 0 };
    },
    [data.progress],
  );

  const lastLesson = useMemo(() => [...data.progress].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null, [data.progress]);

  return { ...data, loading: query.isLoading, completed, passed, markLesson, recordActivity, trackProgress, lastLesson };
}
