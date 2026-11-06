import { useQuery } from '@tanstack/react-query';
import type { Wallet, WalletKind } from '@shared/teaching';
import { api } from '@/lib/api';
import { Empty, PageHeader, PageLoader } from '@/components/ui';
import { Wallet as WalletIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { TeachNav, money, shortDate, useTeacherScope } from './shared';

const KIND: Record<WalletKind, string> = { commission: 'Commission', reversal: 'Reversed', adjustment: 'Adjustment', payout: 'Paid out' };

export default function TeachWallet() {
  const { q } = useTeacherScope();
  const { data, isLoading } = useQuery({ queryKey: ['teach-wallet', q('')], queryFn: () => api.get<{ wallet: Wallet }>(q('/api/teach/wallet')).then((r) => r.wallet) });
  if (isLoading || !data) return <PageLoader />;
  const stats = [
    { label: 'Balance', value: money(data.balanceCents), hint: 'Owed to you now' },
    { label: 'Earned so far', value: money(data.earnedCents), hint: 'All commission, net of reversals' },
    { label: 'Paid out', value: money(data.paidOutCents), hint: 'Sent to you by the Academy' },
    { label: 'Paying learners', value: String(data.payingStudents), hint: `You earn ${data.ratePercent}% of their plan` },
  ];
  return (
    <div className="container py-8">
      <PageHeader title="Wallet" description={`When a learner linked to you pays for a plan, ${data.ratePercent}% goes to your wallet. If a learner has more than one teacher, it is shared equally.`} />
      <TeachNav />
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <dt className="text-sm text-muted-fg">{s.label}</dt>
            <dd className="mt-1 font-display text-3xl font-bold tabular">{s.value}</dd>
            <dd className="mt-1 text-xs text-muted-fg">{s.hint}</dd>
          </div>
        ))}
      </dl>
      <section className="mt-8" aria-labelledby="ledger">
        <h2 id="ledger" className="font-display text-xl font-semibold">History</h2>
        {data.entries.length ? (
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-fg"><tr><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">What</th><th className="px-4 py-2 font-medium">Learner</th><th className="px-4 py-2 font-medium">Note</th><th className="px-4 py-2 text-right font-medium">Amount</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-2">{shortDate(e.createdAt)}</td>
                    <td className="px-4 py-2">{KIND[e.kind]}</td>
                    <td className="px-4 py-2">{e.studentName ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-fg">{e.note || (e.paymentRef ? `Payment ${e.paymentRef}` : '')}</td>
                    <td className={cn('whitespace-nowrap px-4 py-2 text-right font-semibold tabular', e.amountCents < 0 ? 'text-red-700 dark:text-red-300' : 'text-teal-600')}>{e.amountCents > 0 ? '+' : ''}{money(e.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={<WalletIcon className="h-10 w-10" />} title="Nothing here yet">Invite learners and help them learn. When one of them takes a paid plan, your share appears here.</Empty>
        )}
        <p className="mt-3 text-xs text-muted-fg">Payouts are made by the Academy team. Questions about a payment? Use the Contact page.</p>
      </section>
    </div>
  );
}
