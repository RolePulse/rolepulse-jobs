import { getAdminCandidates } from '@/lib/admin-data'

export default async function AdminCandidatesPage() {
  const data = await getAdminCandidates()

  const withoutCv = data.totalCandidates - data.withCv
  const cvPct = data.totalCandidates > 0 ? Math.round((data.withCv / data.totalCandidates) * 100) : 0

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Candidates</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-rp-border rounded-lg p-5">
          <p className="text-xs text-rp-text-3 uppercase tracking-wide mb-1">Total Candidates</p>
          <p className="text-2xl font-semibold">{data.totalCandidates.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-rp-border rounded-lg p-5">
          <p className="text-xs text-rp-text-3 uppercase tracking-wide mb-1">CVs Uploaded</p>
          <p className="text-2xl font-semibold">{data.withCv.toLocaleString()}</p>
          <p className="text-xs text-rp-text-3 mt-1">{cvPct}% of candidates</p>
        </div>
        <div className="bg-white border border-rp-border rounded-lg p-5">
          <p className="text-xs text-rp-text-3 uppercase tracking-wide mb-1">No CV Yet</p>
          <p className="text-2xl font-semibold">{withoutCv.toLocaleString()}</p>
          <p className="text-xs text-rp-text-3 mt-1">{100 - cvPct}% of candidates</p>
        </div>
      </div>

      <div className="bg-white border border-rp-border rounded-lg p-5">
        <p className="text-sm font-medium mb-3">CV Upload Rate</p>
        <div className="w-full bg-rp-border rounded-full h-3">
          <div
            className="bg-rp-accent h-3 rounded-full transition-all"
            style={{ width: `${cvPct}%` }}
          />
        </div>
        <p className="text-xs text-rp-text-3 mt-2">{cvPct}% of candidates have uploaded a CV</p>
      </div>

      <p className="text-xs text-rp-text-3 mt-6">
        Aggregate stats only. No PII shown.
      </p>
    </div>
  )
}
