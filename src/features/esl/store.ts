import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bandForAge, type Accent, type EslBandId, type Patterns, type SupportLang } from '@shared/esl';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { storage } from '@/lib/utils';

export interface EslSettings { band: EslBandId; accent: Accent; age: number | null; week: number; voice: boolean; support?: SupportLang }
export interface Guest { name: string; age: number | null; trial: boolean }
export interface EslMe {
  settings: EslSettings | null;
  progress: { week: number; band: string; done: string[]; stars: number; completed: boolean }[];
  patterns: Patterns;
  notesToTeacher: { area: string; note: string; suggestion: string; created_at: string }[];
  zuvaGames: number;
}

/** Guests: settings stay on this device; a test session's name is forgotten when the tab closes. */
const localSettings = storage<EslSettings | null>('gaa:esl:settings:v1', null);
const localStars = storage<Record<string, number>>('gaa:esl:stars:v1', {});
const guestKey = 'gaa:esl:guest:v1';
const readGuest = (): Guest | null => { try { return JSON.parse(sessionStorage.getItem(guestKey) ?? 'null') as Guest | null; } catch { return null; } };
const writeGuest = (g: Guest | null) => { try { if (g) sessionStorage.setItem(guestKey, JSON.stringify(g)); else sessionStorage.removeItem(guestKey); } catch { /* storage blocked */ } };

export function useEsl() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['esl-me', user?.id], enabled: !!user, queryFn: () => api.get<EslMe>('/api/esl/me') });
  const [local, setLocal] = useState<EslSettings | null>(localSettings.get);
  const [guest, setGuestState] = useState<Guest | null>(readGuest);
  useEffect(() => { if (!user) setLocal(localSettings.get()); }, [user]);

  const settings: EslSettings | null = user ? me.data?.settings ?? null : local;
  const save = useCallback(async (s: Partial<EslSettings>) => {
    const base: EslSettings = settings ?? { band: 'starters', accent: 'gb', age: null, week: 1, voice: true, support: 'off' };
    const next = { ...base, ...s };
    if (s.age && !s.band) next.band = bandForAge(s.age).id;
    if (user) {
      await api.put('/api/esl/me', next);
      await qc.invalidateQueries({ queryKey: ['esl-me'] });
    } else {
      localSettings.set(next);
      setLocal(next);
    }
    return next;
  }, [settings, user, qc]);

  const setGuest = useCallback((g: Guest | null) => { writeGuest(g); setGuestState(g); }, []);
  const starsFor = (week: number, band: string) =>
    user ? me.data?.progress.find((p) => p.week === week && p.band === band)?.stars ?? 0 : localStars.get()[`${week}:${band}`] ?? 0;
  const addLocalStars = (week: number, band: string, n: number) => { const all = localStars.get(); all[`${week}:${band}`] = (all[`${week}:${band}`] ?? 0) + n; localStars.set(all); };
  return { user, me, settings, local, save, guest, setGuest, starsFor, addLocalStars, loading: !!user && me.isLoading };
}
