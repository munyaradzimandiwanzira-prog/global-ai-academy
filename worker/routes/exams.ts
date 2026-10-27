import quizBank from 'virtual:quiz-bank';
import { createRouter, body, requirePermission } from '../app';
import { examSubmitSchema } from '@shared/schemas';
import { EXAM, XP } from '@shared/config';
import type { Certificate } from '@shared/api-types';
import { badRequest, notFound, tooMany, conflict } from '../lib/errors';
import { getTrack } from '../lib/catalog';
import { newId, randomCode } from '../lib/crypto';
import { audit, nowIso, parseJson } from '../lib/db';
import { awardXp } from '../lib/xp';

const exams = createRouter();
const MIN_COMPLETION = 0.6;

/** One question in an attempt plus the option order the learner was shown. */
type AttemptSlot = { id: string; order: number[] };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

exams.get('/:trackId/eligibility', async (c) => {
  const user = c.get('user');
  const track = getTrack(c.req.param('trackId'));
  if (!track) throw notFound('Unknown track.');
  const bank = quizBank[track.id] ?? [];
  if (!user) return c.json({ eligible: false, reason: 'signin', bankSize: bank.length });
  const done = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM progress WHERE user_id = ? AND track_id = ? AND status = 'completed'").bind(user.id, track.id).first<{ n: number }>();
  const cert = await c.env.DB.prepare('SELECT id, score FROM certificates WHERE user_id = ? AND track_id = ?').bind(user.id, track.id).first<{ id: string; score: number }>();
  const last = await c.env.DB.prepare('SELECT submitted_at, passed FROM exam_attempts WHERE user_id = ? AND track_id = ? AND submitted_at IS NOT NULL ORDER BY submitted_at DESC LIMIT 1').bind(user.id, track.id).first<{ submitted_at: string; passed: number }>();
  const completion = (done?.n ?? 0) / track.lessons.length;
  const cooldownUntil = last && !last.passed ? new Date(Date.parse(last.submitted_at) + EXAM.cooldownHours * 3600_000).toISOString() : null;
  return c.json({
    eligible: completion >= MIN_COMPLETION && bank.length >= 5 && (!cooldownUntil || cooldownUntil < nowIso()),
    completion,
    required: MIN_COMPLETION,
    bankSize: bank.length,
    cooldownUntil: cooldownUntil && cooldownUntil > nowIso() ? cooldownUntil : null,
    certificate: cert ?? null,
  });
});

exams.post('/:trackId/start', async (c) => {
  const user = requirePermission(c, 'exam.take', 'Certification exams are part of Plus. Upgrade to earn certificates.');
  const track = getTrack(c.req.param('trackId'));
  if (!track) throw notFound('Unknown track.');
  const bank = quizBank[track.id] ?? [];
  if (bank.length < 5) throw badRequest('This track does not have an exam yet.');
  const done = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM progress WHERE user_id = ? AND track_id = ? AND status = 'completed'").bind(user.id, track.id).first<{ n: number }>();
  if ((done?.n ?? 0) / track.lessons.length < MIN_COMPLETION) {
    throw badRequest(`Complete at least ${Math.round(MIN_COMPLETION * 100)}% of the lessons before taking the exam.`);
  }
  const last = await c.env.DB.prepare('SELECT submitted_at, passed FROM exam_attempts WHERE user_id = ? AND track_id = ? AND submitted_at IS NOT NULL ORDER BY submitted_at DESC LIMIT 1').bind(user.id, track.id).first<{ submitted_at: string; passed: number }>();
  if (last && !last.passed && Date.now() - Date.parse(last.submitted_at) < EXAM.cooldownHours * 3600_000) {
    throw tooMany(`You can retake this exam ${EXAM.cooldownHours} hours after your last attempt. Use the time to review!`);
  }
  // Prefer exam-only questions (their answers never ship to the browser), then top up from lesson quizzes.
  const hidden = shuffle(bank.filter((q) => q.examOnly));
  const visible = shuffle(bank.filter((q) => !q.examOnly));
  const picked = shuffle([...hidden, ...visible].slice(0, Math.min(EXAM.questionCount, bank.length)));
  // Shuffle each question's options per attempt so answer positions can't be memorised or guessed by pattern.
  // `order[i]` is the original index of the option shown at position i; it's stored server-side for grading.
  const slots: AttemptSlot[] = picked.map((q) => ({ id: q.id, order: shuffle(q.options.map((_: string, i: number) => i)) }));
  const id = newId();
  await c.env.DB.prepare('INSERT INTO exam_attempts (id, user_id, track_id, question_ids) VALUES (?, ?, ?, ?)')
    .bind(id, user.id, track.id, JSON.stringify(slots))
    .run();
  return c.json({
    attemptId: id,
    questions: picked.map((q, i) => ({ id: q.id, q: q.q, options: slots[i].order.map((o) => q.options[o]) })),
  });
});

exams.post('/:trackId/submit', async (c) => {
  const user = requirePermission(c, 'exam.take');
  const track = getTrack(c.req.param('trackId'));
  if (!track) throw notFound('Unknown track.');
  const input = await body(c, examSubmitSchema);
  const attempt = await c.env.DB.prepare('SELECT * FROM exam_attempts WHERE id = ? AND user_id = ? AND track_id = ?').bind(input.attemptId, user.id, track.id).first<{ id: string; question_ids: string; submitted_at: string | null; started_at: string }>();
  if (!attempt) throw notFound('Exam attempt not found.');
  if (attempt.submitted_at) throw conflict('This attempt has already been submitted.');
  if (Date.now() - Date.parse(attempt.started_at) > 2 * 3600_000) throw badRequest('This attempt expired. Start a new exam.');

  const bank = new Map((quizBank[track.id] ?? []).map((q) => [q.id, q]));
  // Older attempts stored plain ids (unshuffled options); normalise both shapes.
  const ids = parseJson<Array<string | AttemptSlot>>(attempt.question_ids, []).map((s): AttemptSlot =>
    typeof s === 'string' ? { id: s, order: (bank.get(s)?.options ?? []).map((_: string, i: number) => i) } : s,
  );
  let correct = 0;
  const review = ids.map(({ id: qid, order }) => {
    const q = bank.get(qid);
    const chosen = input.answers[qid];
    const shownAnswer = q ? order.indexOf(q.answer) : -1; // where the right answer appeared for this learner
    const ok = !!q && shownAnswer >= 0 && chosen === shownAnswer;
    if (ok) correct++;
    return { id: qid, correct: ok, answer: shownAnswer, chosen: chosen ?? null, explain: q?.explain ?? null };
  });
  const score = Math.round((correct / Math.max(1, ids.length)) * 100);
  const passed = score >= EXAM.passPercent;
  await c.env.DB.prepare('UPDATE exam_attempts SET score = ?, passed = ?, submitted_at = ? WHERE id = ?').bind(score, passed ? 1 : 0, nowIso(), attempt.id).run();

  let certificate: Certificate | null = null;
  if (passed) {
    const existing = await c.env.DB.prepare('SELECT id FROM certificates WHERE user_id = ? AND track_id = ?').bind(user.id, track.id).first<{ id: string }>();
    const certId = existing?.id ?? `GAA-${randomCode(4)}-${randomCode(4)}`;
    await c.env.DB.prepare(
      `INSERT INTO certificates (id, user_id, track_id, name, score) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, track_id) DO UPDATE SET score = MAX(certificates.score, excluded.score)`,
    ).bind(certId, user.id, track.id, user.name, score).run();
    await awardXp(c.env.DB, user.id, 'exam', track.id, XP.exam);
    await audit(c.env.DB, user.id, 'certificate.issue', certId, { trackId: track.id, score });
    certificate = { id: certId, trackId: track.id, trackTitle: track.title, name: user.name, score, issuedAt: nowIso() };
  }
  return c.json({ score, passed, correct, total: ids.length, review, certificate });
});

exams.get('/certificates/mine', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ certificates: [] });
  const rows = await c.env.DB.prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC').bind(user.id).all<{ id: string; track_id: string; name: string; score: number; issued_at: string }>();
  return c.json({
    certificates: rows.results.map<Certificate>((r) => ({ id: r.id, trackId: r.track_id, trackTitle: getTrack(r.track_id)?.title ?? r.track_id, name: r.name, score: r.score, issuedAt: r.issued_at })),
  });
});

/** Public verification — anyone with the code (or QR) can confirm a certificate. */
exams.get('/certificates/verify/:id', async (c) => {
  const id = c.req.param('id').toUpperCase().slice(0, 20);
  const r = await c.env.DB.prepare('SELECT id, track_id, name, score, issued_at FROM certificates WHERE id = ?').bind(id).first<{ id: string; track_id: string; name: string; score: number; issued_at: string }>();
  if (!r) throw notFound('No certificate matches that code.');
  return c.json({ certificate: { id: r.id, trackId: r.track_id, trackTitle: getTrack(r.track_id)?.title ?? r.track_id, name: r.name, score: r.score, issuedAt: r.issued_at } });
});

export default exams;
