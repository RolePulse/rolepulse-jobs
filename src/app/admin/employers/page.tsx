import { getAdminEmployers } from '@/lib/admin-data'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

const TIER_BADGE: Record<string, string> = {
  standard: 'bg-zinc-100 text-zinc-700',
  featured: 'bg-amber-100 text-amber-700',
  newsletter: 'bg-orange-100 text-rp-accent',
  none: 'bg-gray-50 text-gray-400',
}

export default async function AdminEmployersPage() {
  const employers = await getAdminEmployers()

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">
        Employers
        <span className="ml-2 text-sm font-normal text-rp-text-3">
          ({employers.length} total)
        </span>
      </h1>

      <div className="bg-white border border-rp-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rp-border bg-rp-bg">
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Company</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Billing Email</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Tier</th>
              <th className="text-right px-4 py-3 font-medium text-rp-text-2">Total Spend</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {employers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-rp-text-3">
                  No employers yet.
                </td>
              </tr>
            )}
            {employers.map((e) => (
              <tr key={e.id} className="border-b border-rp-border last:border-0 hover:bg-rp-bg">
                <td className="px-4 py-3 font-medium text-rp-text-1">{e.companyName}</td>
                <td className="px-4 py-3 text-rp-text-2">{e.billingEmail}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${TIER_BADGE[e.tier] ?? TIER_BADGE.none}`}
                  >
                    {e.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">{fmt(e.totalSpend)}</td>
                <td className="px-4 py-3 text-rp-text-3">
                  {new Date(e.joinedAt).toLocaleDateString('en-GB', {
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
