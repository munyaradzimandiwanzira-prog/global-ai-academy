/**
 * What Zuva knows when it teaches English, assembled per turn from the memory layers:
 *
 *   identity    the signed-in account (name from the email they log in with) or, for a guest,
 *               only what they typed this session (first name, age) and whether it is a trial
 *   semantic    esl_learners (band, accent, week), zuva_profiles and recalled zuva_memories
 *   social      their teachers and classes, from how they registered (invite, search or class)
 *   skill       learner-model patterns: struggles, strengths, slow/fast games, enjoyment, due words
 *   episodic    the last few sittings (esl_sessions) and the thread summary
 *   working     the game on screen right now and the last ten messages (added by the agent)
 */
import { eslBand, eslWeek, type Accent, type EslBandId } from '@shared/esl';
import { effectivePlan, type UserRow } from '../lib/db';
import { can } from '@shared/rbac';
import { ESL_FREE_WEEKS } from '@shared/esl';
import { asData } from '../lib/prompts';
import { patterns, type Patterns } from './model';

export interface EslLearner { band: EslBandId; accent: Accent; age: number | null; week: number; voice: boolean }

export async function loadEslLearner(db: D1Database, userId: string): Promise<EslLearner | null> {
  const r = await db.prepare('SELECT band, accent, age, week, voice FROM esl_learners WHERE user_id = ?').bind(userId).first<{ band: EslBandId; accent: Accent; age: number | null; week: number; voice: number }>();
  return r ? { band: r.band, accent: r.accent, age: r.age, week: r.week, voice: !!r.voice } : null;
}

export interface EslContext {
  signedIn: boolean;
  firstName: string | null;
  guest: { name?: string; age?: number; trial: boolean } | null;
  band: EslBandId;
  accent: Accent;
  week: number;
  age: number | null;
  teachers: { name: string; school: string | null }[];
  classes: { name: string; teacher: string }[];
  unitsDone: number;
  patterns: Patterns | null;
  sessions: { week: number; at: string; summary: string }[];
  /** Plus (or trial, teacher, admin): weeks 5–36 are open. */
  pro: boolean;
}

export async function loadEslContext(db: D1Database, user: UserRow | null, input: { band: EslBandId; accent: Accent; week: number; guest?: { name?: string; age?: number; trial: boolean } }): Promise<EslContext> {
  if (!user) {
    return { signedIn: false, firstName: input.guest?.name?.split(/\s+/)[0] ?? null, guest: input.guest ?? { trial: true }, band: input.band, accent: input.accent, week: input.week, age: input.guest?.age ?? null, teachers: [], classes: [], unitsDone: 0, patterns: null, sessions: [], pro: false };
  }
  const [learner, teachers, classes, done, sessions, p] = await Promise.all([
    loadEslLearner(db, user.id),
    db.prepare(`SELECT u.name, u.school FROM teacher_students ts JOIN users u ON u.id = ts.teacher_id WHERE ts.student_id = ? AND u.disabled_at IS NULL LIMIT 5`).bind(user.id).all<{ name: string; school: string | null }>(),
    db.prepare(`SELECT c.name, u.name AS teacher FROM classroom_members m JOIN classrooms c ON c.id = m.classroom_id JOIN users u ON u.id = c.teacher_id WHERE m.user_id = ? AND c.archived_at IS NULL LIMIT 5`).bind(user.id).all<{ name: string; teacher: string }>(),
    db.prepare('SELECT COUNT(*) AS n FROM esl_progress WHERE user_id = ? AND completed_at IS NOT NULL').bind(user.id).first<{ n: number }>(),
    db.prepare('SELECT week, started_at AS at, summary FROM esl_sessions WHERE user_id = ? AND summary IS NOT NULL ORDER BY started_at DESC LIMIT 4').bind(user.id).all<{ week: number; at: string; summary: string }>(),
    patterns(db, user.id),
  ]);
  return {
    signedIn: true,
    firstName: user.name.split(/\s+/)[0] ?? user.name,
    guest: null,
    band: learner?.band ?? input.band,
    accent: learner?.accent ?? input.accent,
    week: input.week,
    age: learner?.age ?? null,
    teachers: teachers.results,
    classes: classes.results,
    unitsDone: done?.n ?? 0,
    patterns: p.overall.attempts ? p : null,
    sessions: sessions.results,
    pro: can({ role: user.role, plan: effectivePlan(user) }, 'content.pro'),
  };
}

const list = (xs: string[]) => (xs.length ? xs.map((x) => asData(x)).join('; ') : 'none yet');

/** The per-turn context block (all of it is data for the model, never instructions). */
export function eslContextBlock(c: EslContext, screen: { activityId?: string; kind?: string; item?: string; heard?: string; task?: string }): string {
  const band = eslBand(c.band)!;
  const week = eslWeek(c.week)!;
  const who = c.signedIn
    ? `<identity>Signed in. First name: ${asData(c.firstName ?? 'unknown')}. Zuva remembers this learner between sessions.${c.age ? ` Age: ${c.age}.` : ''}</identity>`
    : c.guest?.name
      ? `<identity>Guest (not signed in). They told you their first name: ${asData(c.guest.name)}${c.guest.age ? `, age ${c.guest.age}` : ''}. ${c.guest.trial ? 'They chose a test session: nothing is saved and you will forget them afterwards.' : ''}</identity>`
      : `<identity>Guest (not signed in). You don’t know their name yet.${c.guest?.trial ? ' They chose a test session: nothing is saved.' : ''}</identity>`;
  const level = `<course>English as a Second Language. Band: ${band.name} (ages ${band.ages}, ${band.cambridge}, CEFR ${band.cefr}, ${band.tier} years). Week ${week.week} of 36: "${week.title}" (younger learners see it as "${week.theme}"). Grammar focus for older learners: ${week.grammar}. Words this week: ${week.words.map(([w]) => w).join(', ')}. Accent and spelling: ${c.accent === 'us' ? 'American English' : 'British English'}.</course>`;
  const social = c.signedIn
    ? `<teachers>${c.teachers.length ? c.teachers.map((t) => `${asData(t.name)}${t.school ? ` (${asData(t.school)})` : ''}`).join(', ') : 'No teacher linked.'}${c.classes.length ? ` Classes: ${c.classes.map((k) => `${asData(k.name)} with ${asData(k.teacher)}`).join(', ')}.` : ''} Units completed: ${c.unitsDone}.</teachers>`
    : '';
  const p = c.patterns;
  const skill = p
    ? `<learning_patterns>Answers so far: ${p.overall.attempts}, accuracy ${p.overall.accuracy == null ? 'n/a' : Math.round(p.overall.accuracy * 100) + '%'}, trend ${p.overall.trend}.
Struggles: ${list(p.struggles.map((s) => `${s.what} (${s.why})`))}.
Strengths: ${list(p.strengths.map((s) => `${s.what} (${s.why})`))}.
Slow at (compared with their own usual pace): ${list(p.slow.map((s) => `${s.title} ~${s.avgSeconds}s per answer`))}. Quick at: ${list(p.fast.map((s) => `${s.title} ~${s.avgSeconds}s`))}.
Seems to enjoy: ${list(p.enjoys.map((e) => `${e.title} (${e.why})`))}. Seems to avoid: ${list(p.avoids.map((e) => `${e.title} (${e.why})`))}.
Words due for review today: ${list(p.dueWords)}. Tricky words: ${list(p.trickyWords)}.</learning_patterns>`
    : c.signedIn ? '<learning_patterns>No answers recorded yet: this is a new learner.</learning_patterns>' : '';
  const episodes = c.sessions.length ? `<recent_sessions>${c.sessions.map((s) => `Week ${s.week}, ${s.at.slice(0, 10)}: ${asData(s.summary)}`).join('\n')}</recent_sessions>` : '';
  const now = screen.kind ? `<screen>Playing ${asData(screen.kind)}${screen.activityId ? ` (${asData(screen.activityId)})` : ''}${screen.item ? `. Current item: ${asData(screen.item)}` : ''}${screen.heard ? `. The speech recogniser heard: "${asData(screen.heard)}"` : ''}${screen.task ? `. Task: ${asData(screen.task)}` : ''}.</screen>` : '';
  const access = c.pro ? '' : `<access>Weeks 1–${ESL_FREE_WEEKS} are free. Weeks ${ESL_FREE_WEEKS + 1}–36 need Plus (there is a free 7-day trial${c.signedIn ? '' : ' after making a free account'}). If they ask for later weeks, say so kindly once and offer the /pricing page; never pressure a child, talk to the grown-up.</access>`;
  return [who, level, social, access, skill, episodes, now].filter(Boolean).join('\n');
}
