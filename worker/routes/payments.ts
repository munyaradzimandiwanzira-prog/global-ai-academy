import { createRouter, body, requireUser } from '../app';
import { appBase } from '../lib/urls';
import { checkoutSchema, promoQuoteSchema } from '@shared/schemas';
import { PLANS, type PlanId } from '@shared/config';
import { quote } from '../lib/pricing';
import { audit, nowIso } from '../lib/db';
import { newId, randomCode } from '../lib/crypto';
import { badRequest, notFound, unavailable } from '../lib/errors';
import { initiatePayment, parseFormEncoded, pollPayment, verifyPaynowHash, PAID_STATUSES, FAILED_STATUSES } from '../lib/paynow';
import { hit } from '../lib/ratelimit';

const payments = createRouter();

payments.get('/config', (c) => c.json({ paynow: !!(c.env.PAYNOW_INTEGRATION_ID && c.env.PAYNOW_INTEGRATION_KEY) }));

interface PaymentRow {
  id: string; user_id: string; reference: string; plan: PlanId; period: 'monthly' | 'yearly';
  amount_cents: number; status: string; poll_url: string | null; promo_code: string | null;
}

/** Marks a payment as paid and extends the user's plan (idempotent). */
async function settle(db: D1Database, p: PaymentRow, providerRef: string | null) {
  const res = await db.prepare("UPDATE payments SET status = 'paid', provider_ref = ?, updated_at = ? WHERE id = ? AND status != 'paid'").bind(providerRef, nowIso(), p.id).run();
  if (!res.meta.changes) return;
  const user = await db.prepare('SELECT plan, plan_expires_at FROM users WHERE id = ?').bind(p.user_id).first<{ plan: PlanId; plan_expires_at: string | null }>();
  const base = user?.plan === p.plan && user.plan_expires_at && user.plan_expires_at > nowIso() ? Date.parse(user.plan_expires_at) : Date.now();
  const days = p.period === 'yearly' ? 365 : 31;
  await db.prepare('UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?')
    .bind(p.plan, new Date(base + days * 86400_000).toISOString(), nowIso(), p.user_id)
    .run();
  if (p.promo_code) await db.prepare('UPDATE promo_codes SET used = used + 1 WHERE code = ?').bind(p.promo_code).run();
  await audit(db, p.user_id, 'payment.paid', p.reference, { plan: p.plan, period: p.period, cents: p.amount_cents, promo: p.promo_code });
}

/** Prices a plan with an optional promo code, so the checkout shows exactly what will be charged. */
payments.post('/quote', async (c) => {
  requireUser(c);
  const input = await body(c, promoQuoteSchema);
  await hit(c.env.DB, `promo:${c.get('user')!.id}`, 30, 3600, 'Too many promo code attempts. Try again in an hour.');
  return c.json(await quote(c.env.DB, input.plan, input.period, input.code));
});

payments.post('/checkout', async (c) => {
  const user = requireUser(c);
  const input = await body(c, checkoutSchema);
  await hit(c.env.DB, `checkout:${user.id}`, 10, 3600, 'Too many payment attempts. Try again in an hour.');
  const priced = await quote(c.env.DB, input.plan, input.period, input.promoCode);
  const plan = PLANS[input.plan];
  const reference = `GAA-${randomCode(8)}`;
  const id = newId();

  // A 100% code (scholarship-style promo) activates immediately without a payment provider.
  if (priced.amountCents === 0) {
    const row: PaymentRow = { id, user_id: user.id, reference, plan: input.plan, period: input.period, amount_cents: 0, status: 'pending', poll_url: null, promo_code: priced.promoCode };
    await c.env.DB.prepare('INSERT INTO payments (id, user_id, provider, reference, plan, period, amount_cents, list_price_cents, promo_code) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)')
      .bind(id, user.id, 'promo', reference, input.plan, input.period, priced.listCents, priced.promoCode)
      .run();
    await settle(c.env.DB, row, 'promo');
    return c.json({ reference, redirectUrl: null, instructions: null, activated: true });
  }

  if (!c.env.PAYNOW_INTEGRATION_ID || !c.env.PAYNOW_INTEGRATION_KEY) {
    throw unavailable('Online payments are being set up. Contact us to upgrade by bank transfer or mobile money.');
  }
  if (input.method !== 'web' && !input.phone) throw badRequest('Enter the mobile money number to charge.', { phone: 'Required' });
  const base = appBase(c.req.url, c.env.APP_URL);
  const amount = priced.amountCents / 100;
  const result = await initiatePayment({
    integrationId: c.env.PAYNOW_INTEGRATION_ID,
    integrationKey: c.env.PAYNOW_INTEGRATION_KEY,
    reference,
    amount,
    description: `${c.env.APP_NAME} ${plan.name} (${input.period})${priced.promoCode ? ` ${priced.promoCode}` : ''}`,
    email: user.email,
    returnUrl: `${base}/billing/return?ref=${reference}`,
    resultUrl: `${base}/api/payments/paynow/result`,
    mobile: input.method === 'web' ? undefined : { phone: input.phone!, method: input.method },
  });
  if (!result.ok) throw badRequest(result.error ?? 'Payment could not be started.');
  await c.env.DB.prepare('INSERT INTO payments (id, user_id, provider, reference, plan, period, amount_cents, list_price_cents, promo_code, poll_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, 'paynow', reference, input.plan, input.period, priced.amountCents, priced.listCents, priced.promoCode, result.pollUrl ?? null)
    .run();
  return c.json({ reference, redirectUrl: result.browserUrl ?? null, instructions: result.instructions ?? null, activated: false });
});

/** Paynow server-to-server notification. Authenticated by SHA-512 hash, not cookies. */
payments.post('/paynow/result', async (c) => {
  const key = c.env.PAYNOW_INTEGRATION_KEY;
  if (!key) return c.text('not configured', 503);
  const fields = parseFormEncoded(await c.req.text());
  if (!(await verifyPaynowHash(fields, key))) return c.text('bad hash', 400);
  const p = await c.env.DB.prepare('SELECT * FROM payments WHERE reference = ?').bind(fields.reference ?? '').first<PaymentRow>();
  if (!p) return c.text('unknown reference', 404);
  const status = (fields.status ?? '').toLowerCase();
  if (PAID_STATUSES.has(status)) {
    if (Math.round(Number(fields.amount) * 100) !== p.amount_cents) {
      await audit(c.env.DB, null, 'payment.amount_mismatch', p.reference, fields);
      return c.text('amount mismatch', 400);
    }
    await settle(c.env.DB, p, fields.paynowreference ?? null);
  } else if (FAILED_STATUSES.has(status)) {
    await c.env.DB.prepare("UPDATE payments SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'pending'").bind(nowIso(), p.id).run();
  }
  return c.text('ok');
});

/** Client polls this after returning from Paynow (or while waiting for a USSD prompt). */
payments.get('/status/:reference', async (c) => {
  const user = requireUser(c);
  const p = await c.env.DB.prepare('SELECT * FROM payments WHERE reference = ? AND user_id = ?').bind(c.req.param('reference'), user.id).first<PaymentRow>();
  if (!p) throw notFound('Payment not found.');
  if (p.status === 'pending' && p.poll_url && c.env.PAYNOW_INTEGRATION_KEY) {
    const polled = await pollPayment(p.poll_url, c.env.PAYNOW_INTEGRATION_KEY);
    const status = polled?.status?.toLowerCase() ?? '';
    if (PAID_STATUSES.has(status) && Math.round(Number(polled!.amount) * 100) === p.amount_cents) {
      await settle(c.env.DB, p, polled!.paynowreference ?? null);
      return c.json({ status: 'paid', plan: p.plan });
    }
    if (FAILED_STATUSES.has(status)) {
      await c.env.DB.prepare("UPDATE payments SET status = 'failed', updated_at = ? WHERE id = ?").bind(nowIso(), p.id).run();
      return c.json({ status: 'failed', plan: p.plan });
    }
  }
  return c.json({ status: p.status, plan: p.plan });
});

export default payments;
