import { useCallback, useState } from 'react';
import { storage } from '@/lib/utils';
import { useProgress } from '@/lib/progress';
import { useAuth } from '@/lib/auth';

/** Stars per game level, kept locally so the Kids Zone works without an account. */
type Stars = Record<string, number>;
const store = storage<Stars>('gaa:kids:stars:v1', {});

export function useKidsStars() {
  const [stars, setStars] = useState<Stars>(store.get);
  const { recordActivity } = useProgress();
  const { user } = useAuth();

  const award = useCallback(
    (key: string, n: number) => {
      const current = store.get();
      if ((current[key] ?? 0) >= n) return;
      const next = { ...current, [key]: n };
      store.set(next);
      setStars(next);
      if (user) recordActivity({ kind: 'kids', refId: key, trackId: 'kids', passed: true, score: Math.round((n / 3) * 100) });
    },
    [recordActivity, user],
  );

  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  return { stars, award, total };
}
