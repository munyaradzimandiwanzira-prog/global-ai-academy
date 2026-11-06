/**
 * Teacher payout requests. A teacher asks to be paid (up to their wallet balance, one request at a
 * time); an admin sends the money by mobile money or bank and marks it paid, which writes the
 * payout to the wallet ledger. Nothing here moves money by itself.
 */
import type { PayoutMethod, PayoutRequest, PayoutStatus } from '@shared/teaching';

export interface PayoutRow {
  id: string; teacher_id: string; amount_cents: number; method: PayoutMethod; details: string; note: string; status: PayoutStatus;
  admin_note: string; reference: string; wallet_entry_id: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  teacher_name?: string; teacher_email?: string; balance?: number;
}

export const toPayout = (r: PayoutRow, admin = false): PayoutRequest => ({
  id: r.id, amountCents: r.amount_cents, method: r.method, details: r.details, note: r.note, status: r.status,
  adminNote: r.admin_note, reference: r.reference, createdAt: r.created_at, reviewedAt: r.reviewed_at,
  ...(admin && r.teacher_name !== undefined ? { teacher: { id: r.teacher_id, name: r.teacher_name, email: r.teacher_email ?? '', balanceCents: r.balance ?? 0 } } : {}),
});

/** Money a teacher can still ask for: balance minus what an open request already reserves. */
export async function available(db: D1Database, teacherId: string) {
  const r = await db.prepare(
    `SELECT (SELECT COALESCE(SUM(amount_cents),0) FROM wallet_entries WHERE teacher_id = ?1) AS balance,
            (SELECT COALESCE(SUM(amount_cents),0) FROM payout_requests WHERE teacher_id = ?1 AND status = 'pending') AS reserved`,
  ).bind(teacherId).first<{ balance: number; reserved: number }>();
  return { balanceCents: r?.balance ?? 0, reservedCents: r?.reserved ?? 0, availableCents: Math.max(0, (r?.balance ?? 0) - (r?.reserved ?? 0)) };
}

export const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
