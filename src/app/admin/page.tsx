import { getAdminOverview } from '@/lib/admin-data'

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-white border border-rp-border rounded-lg p-5">
      <p className="text-xs text-rp-text-3 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-rp-text-1">{value}</p>
      {sub && <p className="text-xs text-rp-text-3 mt-1">{sub}</p>}
    </div>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export default async function AdminOverviewPage() {
  const data = await getAdminOverview()

  const maxEmployers = Math.max(...data.chartData.map((d) => d.employers), 1)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Listings"
          value={data.totalJobs.toLocaleString()}
          sub={`${data.activeJobs} active · ${data.expiredJobs} expired`}
        />
        <StatCard
          label="Employers"
          value={data.totalEmployers.toLocaleString()}
        />
        <StatCard
          label="Candidates"
          value={data.totalCandidates.toLocaleString()}
          sub="CVs uploaded"
        />
        <StatCard
          label="Revenue This Month"
          value={fmt(data.revenueThisMonth)}
          sub={`${fmt(data.revenueAllTime)} all time`}
        />
      </div>

      {/* Last 30 days employer sign-ups */}
      <div className="bg-white border border-rp-border rounded-lg p-5">
        <p className="text-sm font-medium mb-4">New Employers — Last 30 Days</p>
        <div className="flex items-end gap-1 h-20">
          {data.chartData.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full bg-rp-accent rounded-sm"
                style={{ height: `${(d.employers / maxEmployers) * 100}%`, minHeight: d.employers > 0 ? '4px' : '1px', opacity: d.employers > 0 ? 1 : 0.15 }}
                title={`${d.date}: ${d.employers} employers`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-rp-text-3">
          <span>{data.chartData[0]?.date}</span>
          <span>{data.chartData[data.chartData.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  )
}
