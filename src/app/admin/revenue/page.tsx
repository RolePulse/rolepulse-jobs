import { getAdminRevenue } from '@/lib/admin-data'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export default async function AdminRevenuePage() {
  const data = await getAdminRevenue()

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Revenue</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-rp-border rounded-lg p-5">
          <p className="text-xs text-rp-text-3 uppercase tracking-wide mb-1">This Month</p>
          <p className="text-2xl font-semibold">{fmt(data.mrr)}</p>
        </div>
        <div className="bg-white border border-rp-border rounded-lg p-5">
          <p className="text-xs text-rp-text-3 uppercase tracking-wide mb-1">All Time</p>
          <p className="text-2xl font-semibold">{fmt(data.allTime)}</p>
        </div>
      </div>

      {/* By tier */}
      {data.byTier.length > 0 && (
        <div className="bg-white border border-rp-border rounded-lg p-5 mb-6">
          <p className="text-sm font-medium mb-4">This Month by Tier</p>
          <div className="space-y-3">
            {data.byTier.map((t) => (
              <div key={t.tier} className="flex items-center justify-between text-sm">
                <span className="capitalize text-rp-text-2">{t.tier}</span>
                <span className="font-medium">{fmt(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-white border border-rp-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-rp-border">
          <p className="text-sm font-medium">Recent Transactions</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rp-border bg-rp-bg">
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Company</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Email</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Tier</th>
              <th className="text-right px-4 py-3 font-medium text-rp-text-2">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recentTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-rp-text-3">
                  No transactions yet.
                </td>
              </tr>
            )}
            {data.recentTransactions.map((t) => (
              <tr key={t.id} className="border-b border-rp-border last:border-0 hover:bg-rp-bg">
                <td className="px-4 py-3 font-medium text-rp-text-1">{t.company}</td>
                <td className="px-4 py-3 text-rp-text-2">{t.email}</td>
                <td className="px-4 py-3 capitalize text-rp-text-2">{t.tier ?? '—'}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(t.amount)}</td>
                <td className="px-4 py-3 text-rp-text-3 whitespace-nowrap">
                  {new Date(t.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
