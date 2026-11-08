/** What a teacher sees about a learner's maths: the learner model and Zuva's notes, never the chat. */
import { unitsForStage, type MathsStage } from '@shared/maths';
import type { MathsTeacherView } from '@shared/teaching';
import { patterns } from '../esl/model';
import { loadMathsLearner, MATHS_NAMES } from './context';

export async function mathsTeacherView(db: D1Database, studentId: string): Promise<MathsTeacherView | null> {
  const learner = await loadMathsLearner(db, studentId);
  if (!learner) return null;
  const [p, prog, notes] = await Promise.all([
    patterns(db, studentId, 'maths', MATHS_NAMES),
    db.prepare('SELECT COUNT(completed_at) AS done, COALESCE(SUM(stars), 0) AS stars, MAX(updated_at) AS last FROM maths_progress WHERE user_id = ?').bind(studentId).first<{ done: number; stars: number; last: string | null }>(),
    db.prepare("SELECT id, area, note, suggestion, source, created_at FROM esl_teacher_notes WHERE student_id = ? AND course = 'maths' ORDER BY created_at DESC LIMIT 12").bind(studentId)
      .all<{ id: string; area: string; note: string; suggestion: string; source: 'zuva' | 'weekly'; created_at: string }>(),
  ]);
  return {
    stage: learner.stage, unitsTotal: unitsForStage(learner.stage as MathsStage).length,
    supportLang: learner.support, supportUse: p.support ?? null,
    unitsDone: prog?.done ?? 0, stars: prog?.stars ?? 0, lastActive: p.overall.lastActive ?? prog?.last ?? null,
    attempts: p.overall.attempts, accuracy: p.overall.accuracy, trend: p.overall.trend, skills: p.skills.slice(0, 12),
    struggles: p.struggles, strengths: p.strengths,
    slow: p.slow.map(({ title, avgSeconds }) => ({ title, avgSeconds })), fast: p.fast.map(({ title, avgSeconds }) => ({ title, avgSeconds })),
    enjoys: p.enjoys.map(({ title, why }) => ({ title, why })), avoids: p.avoids.map(({ title, why }) => ({ title, why })),
    trickyWords: p.trickyWords,
    notes: notes.results.map((n) => ({ id: n.id, area: n.area, note: n.note, suggestion: n.suggestion || null, source: n.source, at: n.created_at })),
  };
}

export function mathsViewText(v: MathsTeacherView): string {
  const pct = (x: number | null) => (x == null ? 'n/a' : `${Math.round(x * 100)}%`);
  const join = (xs: string[]) => (xs.length ? xs.join('; ') : 'none yet');
  return [
    `Maths (Cambridge): Stage ${v.stage}. Units completed ${v.unitsDone} of ${v.unitsTotal} in this stage, stars ${v.stars}.`,
    `Answers ${v.attempts}, accuracy ${pct(v.accuracy)}, trend ${v.trend}. Last active ${v.lastActive?.slice(0, 10) ?? 'never'}.`,
    `Struggles: ${join(v.struggles.map((s) => `${s.what} (${s.why})`))}. Strengths: ${join(v.strengths.map((s) => `${s.what} (${s.why})`))}.`,
    `Slower at: ${join(v.slow.map((s) => s.title))}. Quicker at: ${join(v.fast.map((s) => s.title))}. Enjoys: ${join(v.enjoys.map((e) => e.title))}.`,
    `Tricky facts: ${join(v.trickyWords)}.`,
    v.supportLang === 'pt-MZ' ? `Portuguese help on${v.supportUse?.recentRate != null ? `, used on ${pct(v.supportUse.recentRate)} of recent answers` : ''}.` : '',
    v.notes.length ? `Notes from Zuva: ${v.notes.slice(0, 5).map((n) => `${n.area}: ${n.note}`).join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}
