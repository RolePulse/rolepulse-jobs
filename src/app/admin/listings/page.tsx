import { getAdminListings } from '@/lib/admin-data'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-600',
  pending: 'bg-yellow-100 text-yellow-700',
}

export default async function AdminListingsPage() {
  const listings = await getAdminListings()

  const active = listings.filter((j) => j.status === 'active')
  const expired = listings.filter((j) => j.status === 'expired')
  const pending = listings.filter((j) => j.status === 'pending')
  const employer = listings.filter((j) => j.source === 'employer')

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Job Listings</h1>
      <div className="flex gap-4 text-sm text-rp-text-3 mb-6">
        <span>{active.length} active</span>
        <span>{expired.length} expired</span>
        <span>{pending.length} pending</span>
        <span>{employer.length} employer-posted</span>
      </div>

      <div className="bg-white border border-rp-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rp-border bg-rp-bg">
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Title</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Company</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Status</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Source</th>
              <th className="text-right px-4 py-3 font-medium text-rp-text-2">Views</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Posted</th>
              <th className="text-left px-4 py-3 font-medium text-rp-text-2">Expires</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-rp-text-3">
                  No listings.
                </td>
              </tr>
            )}
            {listings.map((j) => (
              <tr key={j.id} className="border-b border-rp-border last:border-0 hover:bg-rp-bg">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {j.isFeatured && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                        Featured
                      </span>
                    )}
                    <a
                      href={`/jobs/${j.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-rp-text-1 hover:text-rp-accent truncate max-w-xs"
                    >
                      {j.title}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3 text-rp-text-2">{j.companyName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_BADGE[j.status] ?? 'bg-zinc-100 text-zinc-700'}`}
                  >
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-rp-text-3 capitalize">{j.source}</td>
                <td className="px-4 py-3 text-right text-rp-text-2">{j.viewCount.toLocaleString()}</td>
                <td className="px-4 py-3 text-rp-text-3 whitespace-nowrap">
                  {j.postedAt
                    ? new Date(j.postedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-rp-text-3 whitespace-nowrap">
                  {j.expiresAt
                    ? new Date(j.expiresAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
