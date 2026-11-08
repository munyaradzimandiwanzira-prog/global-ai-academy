/**
 * What Zuva knows when it teaches maths, assembled per turn (same memory layers as the English
 * course: identity, course position, teachers, skill model, and the screen right now).
 */
import { MATHS_KIND_INFO, mathsUnit, unitsForStage, MATHS_FREE_ORDER, STRAND_NAMES, type MathsStage } from '@shared/maths';
import type { SupportLang, Patterns } from '@shared/esl';
import { can } from '@shared/rbac';
import { effectivePlan, type UserRow } from '../lib/db';
import { asData } from '../lib/prompts';
import { patterns, type CourseNames } from '../esl/model';

/** How the shared learner model names maths skills, game kinds and units. */
export const MATHS_NAMES: CourseNames = {
  skills: { number: 'number', geometry: 'geometry and measure', statistics: 'statistics and probability', reasoning: 'reasoning (convince me)' },
  kind: (k) => MATHS_KIND_INFO[k as keyof typeof MATHS_KIND_INFO]?.title ?? k,
  unit: (skill) => mathsUnit(skill.split(':')[1] ?? '')?.title,
};

export interface MathsLearner { stage: MathsStage; age: number | null; support: SupportLang; voice: boolean }
export async function loadMathsLearner(db: D1Database, userId: string): Promise<MathsLearner | null> {
  const r = await db.prepare('SELECT stage, age, support, voice FROM maths_learners WHERE user_id = ?').bind(userId).first<{ stage: MathsStage; age: number | null; support: SupportLang; voice: number }>();
  return r ? { stage: r.stage, age: r.age, support: r.support, voice: !!r.voice } : null;
}

export interface MathsContext {
  signedIn: boolean; firstName: string | null; guest: { name?: string; age?: number; trial: boolean } | null;
  stage: MathsStage; unitId: string | null; support: SupportLang; pro: boolean;
  teachers: string[]; unitsDone: number; patterns: Patterns | null;
}

export async function loadMathsContext(db: D1Database, user: UserRow | null, input: { stage: MathsStage; unitId?: string; support?: SupportLang; guest?: MathsContext['guest'] }): Promise<MathsContext> {
  if (!user) return { signedIn: false, firstName: input.guest?.name?.split(/\s+/)[0] ?? null, guest: input.guest ?? { trial: true }, stage: input.stage, unitId: input.unitId ?? null, support: input.support ?? 'off', pro: false, teachers: [], unitsDone: 0, patterns: null };
  const [learner, teachers, done, p] = await Promise.all([
    loadMathsLearner(db, user.id),
    db.prepare('SELECT u.name FROM teacher_students ts JOIN users u ON u.id = ts.teacher_id WHERE ts.student_id = ? AND u.disabled_at IS NULL LIMIT 5').bind(user.id).all<{ name: string }>(),
    db.prepare('SELECT COUNT(*) AS n FROM maths_progress WHERE user_id = ? AND completed_at IS NOT NULL').bind(user.id).first<{ n: number }>(),
    patterns(db, user.id, 'maths', MATHS_NAMES),
  ]);
  return {
    signedIn: true, firstName: user.name.split(/\s+/)[0] ?? user.name, guest: null,
    stage: learner?.stage ?? input.stage, unitId: input.unitId ?? null, support: input.support ?? learner?.support ?? 'off',
    pro: can({ role: user.role, plan: effectivePlan(user) }, 'content.pro'),
    teachers: teachers.results.map((t) => t.name), unitsDone: done?.n ?? 0, patterns: p.overall.attempts ? p : null,
  };
}

const list = (xs: string[]) => (xs.length ? xs.map((x) => asData(x)).join('; ') : 'none yet');

export function mathsContextBlock(c: MathsContext, screen: { activityId?: string; kind?: string; item?: string; task?: string }): string {
  const who = c.signedIn ? `<identity>Signed in. First name: ${asData(c.firstName ?? 'unknown')}. Zuva remembers this learner.</identity>`
    : `<identity>Guest${c.guest?.name ? `, first name ${asData(c.guest.name)}` : ''}${c.guest?.age ? `, age ${c.guest.age}` : ''}.${c.guest?.trial ? ' Test session: nothing is saved.' : ''}</identity>`;
  const unit = c.unitId ? mathsUnit(c.unitId) : null;
  const units = unitsForStage(c.stage).map((u) => `${u.id} "${u.title}" (${STRAND_NAMES[u.strand].en}${!c.pro && u.order > MATHS_FREE_ORDER ? ', Plus' : ''})`).join('; ');
  const course = `<course>Cambridge Maths, Stage ${c.stage}. Units: ${units}.${unit ? ` Now on unit ${unit.id}: "${unit.title}". Objectives: ${unit.objectives.join('; ')}. Maths words: ${unit.words.map(([e]) => e).join(', ')}.` : ''}</course>`;
  const social = c.signedIn ? `<teachers>${c.teachers.length ? c.teachers.map(asData).join(', ') : 'No teacher linked.'} Units completed: ${c.unitsDone}.</teachers>` : '';
  const p = c.patterns;
  const skill = p ? `<learning_patterns>Answers ${p.overall.attempts}, accuracy ${p.overall.accuracy == null ? 'n/a' : Math.round(p.overall.accuracy * 100) + '%'}, trend ${p.overall.trend}.
Struggles: ${list(p.struggles.map((s) => `${s.what} (${s.why})`))}. Strengths: ${list(p.strengths.map((s) => `${s.what} (${s.why})`))}.
Slow at: ${list(p.slow.map((s) => s.title))}. Quick at: ${list(p.fast.map((s) => s.title))}. Enjoys: ${list(p.enjoys.map((e) => e.title))}. Avoids: ${list(p.avoids.map((e) => e.title))}.
Facts due for review: ${list(p.dueWords)}. Tricky: ${list(p.trickyWords)}.</learning_patterns>` : c.signedIn ? '<learning_patterns>No answers yet.</learning_patterns>' : '';
  const sp = c.support === 'pt-MZ' ? `<support_language>Portuguese help is ON (Mozambique).${p?.support?.recentRate != null ? ` Used on ${Math.round(p.support.recentRate * 100)}% of recent answers.` : ''}</support_language>` : '';
  const access = c.pro ? '' : `<access>Units 1–${MATHS_FREE_ORDER} of each stage are free; the rest need Plus (7-day free trial). Mention it kindly once if asked.</access>`;
  const now = screen.kind ? `<screen>Playing ${asData(screen.kind)}${screen.activityId ? ` (${asData(screen.activityId)})` : ''}${screen.item ? `. Current question: ${asData(screen.item)}` : ''}${screen.task ? `. Task: ${asData(screen.task)}` : ''}.</screen>` : '';
  return [who, course, social, access, sp, skill, now].filter(Boolean).join('\n');
}
