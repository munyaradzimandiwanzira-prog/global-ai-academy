import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { stageForAge, type MathsStage } from '@shared/maths';
import type { Patterns, SupportLang } from '@shared/esl';
import { api } from '@/lib/api';
import { storage } from '@/lib/utils';
import { useEsl } from '@/features/esl/store';

export interface MathsSettings { stage: MathsStage; age: number | null; support: SupportLang; voice: boolean }
export interface MathsMe { settings: MathsSettings | null; progress: { unitId: string; done: string[]; stars: number; completed: boolean }[]; patterns: Patterns }

const localSettings = storage<MathsSettings | null>('gaa:maths:settings:v1', null);
const localStars = storage<Record<string, number>>('gaa:maths:stars:v1', {});

/** Cambridge Maths settings and progress: on the server when signed in, on this device for guests. */
export function useMaths() {
  const { user, guest, setGuest } = useEsl();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['maths-me', user?.id], enabled: !!user, queryFn: () => api.get<MathsMe>('/api/maths/me') });
  const [local, setLocal] = useState<MathsSettings | null>(localSettings.get);
  const settings: MathsSettings | null = user ? me.data?.settings ?? null : local;
  const save = useCallback(async (s: Partial<MathsSettings>) => {
    const base: MathsSettings = settings ?? { stage: 1, age: null, support: 'off', voice: true };
    const next: MathsSettings = { ...base, ...s };
    if (s.age && !s.stage) next.stage = stageForAge(s.age);
    if (user) { await api.put('/api/maths/me', next); await qc.invalidateQueries({ queryKey: ['maths-me'] }); }
    else { localSettings.set(next); setLocal(next); }
    return next;
  }, [settings, user, qc]);
  const starsFor = (unitId: string) => (user ? me.data?.progress.find((p) => p.unitId === unitId)?.stars ?? 0 : localStars.get()[unitId] ?? 0);
  const doneFor = (unitId: string) => (user ? me.data?.progress.find((p) => p.unitId === unitId)?.done ?? [] : []);
  const addLocalStars = (unitId: string, n: number) => { const all = localStars.get(); all[unitId] = (all[unitId] ?? 0) + n; localStars.set(all); };
  return { user, me, settings, save, guest, setGuest, starsFor, doneFor, addLocalStars, loading: !!user && me.isLoading };
}
