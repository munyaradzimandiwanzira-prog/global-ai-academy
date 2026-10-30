/**
 * Safety layer around Zuva (defence in depth; the persona prompt is only one layer):
 *  1. Scrub personal identifiers from children's messages before they reach the model or storage.
 *  2. Moderate input. Children get a kind, fixed reply instead of a model call when input is flagged.
 *  3. Spot crisis language even when moderation is unavailable, and answer with help resources.
 *  4. Moderate the model's own reply in Kids mode before showing it.
 */
import { moderate } from '../lib/openai';
import type { ZuvaMode } from '@shared/zuva';

const SCRUB: [RegExp, string][] = [
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, '[email removed]'],
  [/(\+?\d[\d\s-]{7,}\d)/g, '[number removed]'],
];

export function scrubForChild(text: string): { text: string; removed: boolean } {
  let out = text;
  for (const [r, rep] of SCRUB) out = out.replace(r, rep);
  return { text: out, removed: out !== text };
}

const CRISIS = /\b(kill myself|want to die|end my life|suicid\w*|hurt myself|cut myself|self[- ]harm|nobody loves me|someone is hurting me|he hurts me|she hurts me|touched me|abus(e|ed|ing) me)\b/i;

export const CHILD_HELP =
  'I’m really glad you told me. What is happening is not your fault, and you deserve to be safe. Please tell a grown-up you trust, like a parent, carer or teacher, today. In Zimbabwe you can also call Childline for free on 116, any time, day or night.';
export const ADULT_HELP =
  'I’m sorry you’re going through this, and I’m glad you said something. You don’t have to handle it alone. If you might be in danger, please contact local emergency services or go to your nearest clinic now, and reach out to someone you trust today. If you are under 18 in Zimbabwe, Childline is free on 116, any time.';

const CHILD_DECLINE = 'That’s not something I can help with. Let’s find something fun to learn instead! Want to try a game, or build an experiment together?';
const LEARNER_DECLINE = 'I can’t help with that one. I’m happy to help with coding, AI, data, engineering or anything you’re learning here.';

export type InputVerdict = { action: 'allow'; text: string; note?: string } | { action: 'respond'; reply: string };

export async function checkInput(env: Env, mode: ZuvaMode, raw: string): Promise<InputVerdict> {
  let text = raw;
  let note: string | undefined;
  if (mode === 'kids') {
    const s = scrubForChild(raw);
    text = s.text;
    if (s.removed) note = 'The child typed a phone number or email; it was removed. Gently remind them to keep such details private.';
  }
  if (CRISIS.test(raw)) return { action: 'respond', reply: mode === 'kids' ? CHILD_HELP : ADULT_HELP };
  const m = await moderate(env, raw);
  if (m?.flagged) {
    if (m.categories.some((c) => c.startsWith('self-harm'))) return { action: 'respond', reply: mode === 'kids' ? CHILD_HELP : ADULT_HELP };
    // Adults may discuss security, history etc.; only hard categories are declined outright.
    const hard = m.categories.some((c) => /sexual|minors|violence\/graphic|hate\/threatening|illicit\/violent/.test(c));
    if (mode === 'kids' || hard) return { action: 'respond', reply: mode === 'kids' ? CHILD_DECLINE : LEARNER_DECLINE };
  }
  return { action: 'allow', text, note };
}

export async function checkOutput(env: Env, mode: ZuvaMode, reply: string): Promise<string> {
  if (mode !== 'kids') return reply;
  const m = await moderate(env, reply);
  if (m?.flagged) return 'Hmm, let me try that again in a better way. Can you ask me in a different way?';
  return reply;
}
