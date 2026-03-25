export function JobRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-0 py-6 border-b border-rp-border">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-8 h-8 rounded bg-rp-bg animate-pulse" />
        <div className="flex-1">
          <div className="h-5 bg-rp-bg animate-pulse rounded w-3/4 mb-2" />
          <div className="h-4 bg-rp-bg animate-pulse rounded w-1/2" />
        </div>
      </div>
      <div className="text-right space-y-1">
        <div className="h-4 bg-rp-bg animate-pulse rounded w-24" />
        <div className="h-4 bg-rp-bg animate-pulse rounded w-20" />
      </div>
    </div>
  )
}
