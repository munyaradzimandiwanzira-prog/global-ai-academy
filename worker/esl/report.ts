/**
 * What a teacher sees about a learner's English: the learner model (mastery, pace, enjoyment,
 * tricky words), progress and the notes Zuva left. Never the chat itself: what a child tells
 * Zuva stays between them, and notes were checked for personal details before they were saved.
 */
import { eslBand } from '@shared/esl';
import type { EslTeacherView } from '@shared/teaching';
import { loadEslLearner } from './context';
import { patterns } from './model';

export async function eslTeacherView(db: D1Database, studentId: string): Promise<EslTeacherView | null> {
  const learner = await loadEslLearner(db, studentId);
  if (!learner) return null;
  const [p, prog, notes] = await Promise.all([
    patterns(db, studentId),
    db.prepare('SELECT COUNT(completed_at) AS done, COALESCE(SUM(stars), 0) AS stars, MAX(updated_at) AS last FROM esl_progress WHERE user_id = ?').bind(studentId).first<{ done: number; stars: number; last: string | null }>(),
    db.prepare("SELECT id, area, note, suggestion, source, created_at FROM esl_teacher_notes WHERE student_id = ? AND course = 'esl' ORDER BY created_at DESC LIMIT 12").bind(studentId)
      .all<{ id: string; area: string; note: string; suggestion: string; source: 'zuva' | 'weekly'; created_at: string }>(),
  ]);
  return {
    band: learner.band,
    bandName: eslBand(learner.band)?.name ?? learner.band,
    accent: learner.accent,
    week: learner.week,
    supportLang: learner.support,
    supportUse: p.support ?? null,
    unitsDone: prog?.done ?? 0,
    stars: prog?.stars ?? 0,
    lastActive: p.overall.lastActive ?? prog?.last ?? null,
    attempts: p.overall.attempts,
    accuracy: p.overall.accuracy,
    trend: p.overall.trend,
    skills: p.skills.slice(0, 12),
    struggles: p.struggles,
    strengths: p.strengths,
    slow: p.slow.map(({ title, avgSeconds }) => ({ title, avgSeconds })),
    fast: p.fast.map(({ title, avgSeconds }) => ({ title, avgSeconds })),
    enjoys: p.enjoys.map(({ title, why }) => ({ title, why })),
    avoids: p.avoids.map(({ title, why }) => ({ title, why })),
    trickyWords: p.trickyWords,
    notes: notes.results.map((n) => ({ id: n.id, area: n.area, note: n.note, suggestion: n.suggestion || null, source: n.source, at: n.created_at })),
  };
}

/** A compact plain-text version for Zuva's teacher tools and the AI report writer. */
export function eslViewText(v: EslTeacherView): string {
  const pct = v.accuracy == null ? 'n/a' : `${Math.round(v.accuracy * 100)}%`;
  const join = (xs: string[]) => (xs.length ? xs.join('; ') : 'none yet');
  return [
    `English (ESL): ${v.bandName}, week ${v.week} of 36, ${v.accent === 'us' ? 'American' : 'British'} English. Units completed ${v.unitsDone}, stars ${v.stars}.`,
    `Answers ${v.attempts}, accuracy ${pct}, trend ${v.trend}. Last active ${v.lastActive?.slice(0, 10) ?? 'never'}.`,
    `Struggles: ${join(v.struggles.map((s) => `${s.what} (${s.why})`))}.`,
    `Strengths: ${join(v.strengths.map((s) => `${s.what} (${s.why})`))}.`,
    `Slower at: ${join(v.slow.map((s) => `${s.title} ~${s.avgSeconds}s`))}. Quicker at: ${join(v.fast.map((s) => `${s.title} ~${s.avgSeconds}s`))}.`,
    `Enjoys: ${join(v.enjoys.map((e) => e.title))}. Avoids: ${join(v.avoids.map((e) => e.title))}.`,
    `Tricky words: ${join(v.trickyWords)}.`,
    v.supportLang === 'pt-MZ' ? `Portuguese help is on. ${v.supportUse?.recentRate != null ? `Used on ${Math.round(v.supportUse.recentRate * 100)}% of answers in the last two weeks${v.supportUse.previousRate != null ? ` (${Math.round(v.supportUse.previousRate * 100)}% the two weeks before)` : ''}.` : 'Not used yet.'}` : '',
    v.notes.length ? `Notes from Zuva: ${v.notes.slice(0, 5).map((n) => `[${n.at.slice(0, 10)}] ${n.area}: ${n.note}${n.suggestion ? ` Try: ${n.suggestion}` : ''}`).join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}
