import { useSyncExternalStore } from 'react';
import { stageOf, type StageId } from '@shared/kids-curriculum';
import { storage } from '@/lib/utils';

/**
 * The child's chosen Cambridge stage, kept on this device so the Kids Zone works without an
 * account. One store, shared by the stage picker, the learning path and Zuva.
 */
const pref = storage<StageId | null>('gaa:kids:stage:v1', null);
const listeners = new Set<() => void>();
let current: StageId | null = stageOf(pref.get())?.id ?? null;

export function setKidsStage(stage: StageId | null) {
  current = stage;
  pref.set(stage);
  listeners.forEach((l) => l());
}

export const getKidsStage = () => current;

export function useKidsStage(): [StageId | null, (s: StageId | null) => void] {
  const stage = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
    () => null,
  );
  return [stage, setKidsStage];
}
