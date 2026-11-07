/**
 * The model is asked for JSON of a given shape, but nothing guarantees it. These functions turn
 * whatever came back (or whatever an older version stored) into the exact shape the app renders,
 * so a missing list can never crash a page.
 */
import type { AiFeedback, LearnerReport, SessionSummary } from '@shared/api-types';

type Raw = Record<string, unknown> | null | undefined;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
export const text = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '');
export const texts = (v: unknown, n = 8, max = 400): string[] => (Array.isArray(v) ? v.map((x) => text(x, max)).filter(Boolean).slice(0, n) : []);
const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt;
};

/** AI pre-mark of a submission; null when the model gave nothing usable. */
export function aiFeedback(raw: unknown): AiFeedback | null {
  const r = obj(raw);
  const summary = text(r.summary, 1200);
  if (!summary && r.score === undefined) return null;
  const score = clamp(r.score, 0, 100, 0);
  return { score, pass: typeof r.pass === 'boolean' ? r.pass : score >= 50, strengths: texts(r.strengths), improvements: texts(r.improvements), summary };
}

export function classInsights(raw: Raw) {
  const r = obj(raw);
  return {
    summary: text(r.summary, 1500),
    atRisk: (Array.isArray(r.atRisk) ? r.atRisk : []).map((x) => ({ name: text(obj(x).name, 120), reason: text(obj(x).reason, 400) })).filter((x) => x.name).slice(0, 30),
    strengths: texts(r.strengths),
    actions: texts(r.actions),
  };
}

export function learnerReport(raw: unknown): LearnerReport['content'] | null {
  const r = obj(raw);
  const overview = text(r.overview, 1500);
  if (!overview) return null;
  const plan = obj(r.plan);
  const sev = (v: unknown): 'low' | 'medium' | 'high' => (v === 'low' || v === 'medium' || v === 'high' ? v : 'medium');
  return {
    overview,
    strengths: texts(r.strengths),
    gaps: (Array.isArray(r.gaps) ? r.gaps : []).map((g) => ({ area: text(obj(g).area, 160), evidence: text(obj(g).evidence, 500), severity: sev(obj(g).severity) })).filter((g) => g.area).slice(0, 8),
    plan: { nextTwoWeeks: texts(plan.nextTwoWeeks), thisMonth: texts(plan.thisMonth), longTerm: text(plan.longTerm, 600) },
    suggestedLessons: texts(r.suggestedLessons, 8, 200),
    atRisk: r.atRisk === true,
  };
}

export function sessionSummary(raw: unknown): SessionSummary | null {
  const r = obj(raw);
  const summary = text(r.summary, 2000);
  if (!summary) return null;
  return {
    summary,
    topics: texts(r.topics, 12, 160),
    endedAt: text(r.endedAt, 300),
    keyPoints: (Array.isArray(r.keyPoints) ? r.keyPoints : []).map((k) => ({ point: text(obj(k).point, 400), by: text(obj(k).by, 80) })).filter((k) => k.point).slice(0, 12),
    actionItems: texts(r.actionItems, 12),
    questionsToRevisit: texts(r.questionsToRevisit, 12),
  };
}

export function assignmentDraft(raw: unknown) {
  const r = obj(raw);
  return { title: text(r.title, 150), instructions: text(r.instructions, 10_000), starterCode: text(r.starterCode, 20_000), rubric: text(r.rubric, 4000) };
}
