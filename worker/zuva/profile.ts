/**
 * Builds Zuva's picture of the learner from what the Academy already knows: name, level, plan,
 * progress, goals and the learner-editable profile. Only learning-relevant fields are used;
 * city and school are deliberately left out (data minimisation, especially for child accounts).
 */
import type { UserRow } from '../lib/db';
import { effectivePlan, parseJson } from '../lib/db';
import { getTrack } from '../lib/catalog';
import type { ZuvaProfile } from '@shared/zuva';

export interface LearnerContext {
  userId: string;
  firstName: string;
  level: string;
  isKid: boolean;
  plan: string;
  streak: number;
  xp: number;
  lastLesson?: string;
  kidsStars: number;
  kidsGames: Record<string, number>;
  tracks: { id: string; title: string; done: number; total: number }[];
  struggles: string[];
  goals: string[];
  profile: ZuvaProfile;
}

interface ProfileRow { interests: string; goals: string; learning_style: string | null; memory_enabled: number }

export async function loadProfile(db: D1Database, userId: string): Promise<ZuvaProfile> {
  const row = await db.prepare('SELECT interests, goals, learning_style, memory_enabled FROM zuva_profiles WHERE user_id = ?').bind(userId).first<ProfileRow>();
  return {
    interests: parseJson<string[]>(row?.interests, []),
    goals: parseJson<string[]>(row?.goals, []),
    learningStyle: row?.learning_style ?? null,
    memoryEnabled: row ? row.memory_enabled === 1 : true,
  };
}

export async function saveProfile(db: D1Database, userId: string, p: Partial<ZuvaProfile>): Promise<void> {
  const cur = await loadProfile(db, userId);
  const next = { ...cur, ...p };
  const clip = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].slice(0, 12).map((x) => x.slice(0, 60));
  await db
    .prepare(
      `INSERT INTO zuva_profiles (user_id, interests, goals, learning_style, memory_enabled, updated_at) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(user_id) DO UPDATE SET interests = excluded.interests, goals = excluded.goals, learning_style = excluded.learning_style, memory_enabled = excluded.memory_enabled, updated_at = excluded.updated_at`,
    )
    .bind(userId, JSON.stringify(clip(next.interests)), JSON.stringify(clip(next.goals)), next.learningStyle?.slice(0, 120) ?? null, next.memoryEnabled ? 1 : 0)
    .run();
}

export async function loadLearnerContext(db: D1Database, user: UserRow): Promise<LearnerContext> {
  const [progress, kids, struggles, goals, profile] = await Promise.all([
    db.prepare(`SELECT track_id, SUM(status = 'completed') AS done, MAX(updated_at) AS last FROM progress WHERE user_id = ? GROUP BY track_id ORDER BY last DESC LIMIT 4`).bind(user.id).all<{ track_id: string; done: number }>(),
    db.prepare(`SELECT ref_id, score FROM activity WHERE user_id = ? AND kind = 'kids'`).bind(user.id).all<{ ref_id: string; score: number }>(),
    db.prepare(`SELECT kind, ref_id, track_id, attempts FROM activity WHERE user_id = ? AND passed = 0 AND attempts >= 3 AND kind != 'kids' ORDER BY updated_at DESC LIMIT 4`).bind(user.id).all<{ kind: string; ref_id: string; track_id: string | null; attempts: number }>(),
    db.prepare(`SELECT title FROM goals WHERE user_id = ? AND completed_at IS NULL ORDER BY created_at DESC LIMIT 3`).bind(user.id).all<{ title: string }>(),
    loadProfile(db, user.id),
  ]);

  const kidsGames: Record<string, number> = {};
  let kidsStars = 0;
  for (const r of kids.results) {
    const stars = Math.round(((r.score ?? 0) / 100) * 3);
    kidsStars += stars;
    const game = r.ref_id.split(':')[0]!;
    kidsGames[game] = (kidsGames[game] ?? 0) + stars;
  }
  const tracks = progress.results.flatMap((p) => {
    const t = getTrack(p.track_id);
    return t ? [{ id: t.id, title: t.title, done: Number(p.done) || 0, total: t.lessons.length }] : [];
  });
  const last = user.last_lesson ? user.last_lesson.split('/') : null;
  const lastTrack = last ? getTrack(last[0]!) : undefined;
  const lastLesson = lastTrack ? `${lastTrack.lessons.find((l) => l.slug === last![1])?.title ?? last![1]} (${lastTrack.title})` : undefined;

  return {
    userId: user.id,
    firstName: user.name.trim().split(/\s+/)[0]!.slice(0, 40),
    level: user.level,
    isKid: user.level === 'kids',
    plan: effectivePlan(user),
    streak: user.streak,
    xp: user.xp,
    lastLesson,
    kidsStars,
    kidsGames,
    tracks,
    struggles: struggles.results.map((s) => `${s.kind} "${s.ref_id}"${s.track_id ? ` in ${getTrack(s.track_id)?.title ?? s.track_id}` : ''} (${s.attempts} tries)`),
    goals: goals.results.map((g) => g.title),
    profile,
  };
}
