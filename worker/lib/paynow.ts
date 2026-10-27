import { sha512HexUpper, timingSafeEqual } from './crypto';

/**
 * Paynow Zimbabwe integration (https://developers.paynow.co.zw).
 * Supports web checkout (Visa/Mastercard/EcoCash/OneMoney/ZimSwitch on Paynow's page)
 * and express mobile checkout (USSD push to the payer's EcoCash / OneMoney wallet).
 *
 * Hash rule: SHA-512 over the concatenation of all field values in the order sent
 * (excluding "hash"), followed by the integration key, hex upper-case.
 */

const INITIATE_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';
const MOBILE_URL = 'https://www.paynow.co.zw/interface/remotetransaction';

export type PaynowFields = Record<string, string>;

export async function paynowHash(fields: PaynowFields, integrationKey: string): Promise<string> {
  const concatenated = Object.entries(fields)
    .filter(([k]) => k.toLowerCase() !== 'hash')
    .map(([, v]) => v)
    .join('');
  return sha512HexUpper(concatenated + integrationKey);
}

export async function verifyPaynowHash(fields: PaynowFields, integrationKey: string): Promise<boolean> {
  const received = fields.hash ?? fields.Hash;
  if (!received) return false;
  const expected = await paynowHash(fields, integrationKey);
  return timingSafeEqual(expected, received.toUpperCase());
}

export function parseFormEncoded(body: string): PaynowFields {
  const out: PaynowFields = {};
  for (const [k, v] of new URLSearchParams(body)) out[k.toLowerCase()] = v;
  return out;
}

export interface InitiateArgs {
  integrationId: string;
  integrationKey: string;
  reference: string;
  amount: number; // dollars
  description: string;
  email: string;
  returnUrl: string;
  resultUrl: string;
  mobile?: { phone: string; method: 'ecocash' | 'onemoney' };
}

export interface InitiateResult {
  ok: boolean;
  browserUrl?: string;
  pollUrl?: string;
  instructions?: string;
  error?: string;
}

export async function initiatePayment(args: InitiateArgs): Promise<InitiateResult> {
  // Field order matters for the hash.
  const fields: PaynowFields = {
    id: args.integrationId,
    reference: args.reference,
    amount: args.amount.toFixed(2),
    additionalinfo: args.description,
    returnurl: args.returnUrl,
    resulturl: args.resultUrl,
    authemail: args.email,
    ...(args.mobile ? { phone: args.mobile.phone, method: args.mobile.method } : {}),
    status: 'Message',
  };
  fields.hash = await paynowHash(fields, args.integrationKey);

  const res = await fetch(args.mobile ? MOBILE_URL : INITIATE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
  const parsed = parseFormEncoded(await res.text());
  if ((parsed.status ?? '').toLowerCase() !== 'ok') {
    return { ok: false, error: parsed.error ?? 'Paynow rejected the request.' };
  }
  if (!(await verifyPaynowHash(parsed, args.integrationKey))) {
    return { ok: false, error: 'Paynow response failed verification.' };
  }
  return { ok: true, browserUrl: parsed.browserurl, pollUrl: parsed.pollurl, instructions: parsed.instructions };
}

export async function pollPayment(pollUrl: string, integrationKey: string): Promise<PaynowFields | null> {
  const res = await fetch(pollUrl, { method: 'POST' });
  const parsed = parseFormEncoded(await res.text());
  if (!(await verifyPaynowHash(parsed, integrationKey))) return null;
  return parsed;
}

/** Paynow statuses that mean money has been received. */
export const PAID_STATUSES = new Set(['paid', 'awaiting delivery', 'delivered']);
export const FAILED_STATUSES = new Set(['cancelled', 'failed', 'disputed', 'refunded']);
