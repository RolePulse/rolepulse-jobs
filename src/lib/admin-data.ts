import { createServiceClient } from '@/lib/supabase/service'

export async function getAdminOverview() {
  const supabase = createServiceClient()

  const [
    { count: totalJobs },
    { count: activeJobs },
    { count: expiredJobs },
    { count: totalEmployers },
    { count: totalCandidates },
    { data: recentActivity },
    { data: revenueRows },
  ] = await Promise.all([
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired'),
    supabase.from('employers').select('*', { count: 'exact', head: true }),
    supabase
      .from('job_seeker_profiles')
      .select('*', { count: 'exact', head: true }),
    // Last 30 days: new employers + new jobs per day
    supabase
      .from('employers')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    // Revenue from paid stripe orders
    supabase
      .from('stripe_orders')
      .select('amount_pence, created_at, product_type')
      .eq('status', 'paid'),
  ])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const revenueThisMonth =
    (revenueRows || [])
      .filter((r) => new Date(r.created_at) >= startOfMonth)
      .reduce((sum, r) => sum + (r.amount_pence || 0), 0) / 100

  const revenueAllTime =
    (revenueRows || []).reduce((sum, r) => sum + (r.amount_pence || 0), 0) / 100

  // Build last-30-days chart data
  const days: Record<string, { date: string; employers: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    days[key] = { date: key, employers: 0 }
  }
  for (const e of recentActivity || []) {
    const key = e.created_at.slice(0, 10)
    if (days[key]) days[key].employers++
  }

  return {
    totalJobs: totalJobs ?? 0,
    activeJobs: activeJobs ?? 0,
    expiredJobs: expiredJobs ?? 0,
    totalEmployers: totalEmployers ?? 0,
    totalCandidates: totalCandidates ?? 0,
    revenueThisMonth,
    revenueAllTime,
    chartData: Object.values(days),
  }
}

export async function getAdminEmployers() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('employers')
    .select(
      `id, billing_email, stripe_customer_id, created_at,
       companies!inner(name),
       stripe_orders(product_type, amount_pence, status, created_at)`
    )
    .order('created_at', { ascending: false })

  return (data || []).map((e: Record<string, unknown>) => {
    const orders = (e.stripe_orders as Array<{ product_type: string; status: string; amount_pence: number; created_at: string }> || []).filter(
      (o) => o.status === 'paid'
    )
    const latestOrder = orders.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    return {
      id: e.id as string,
      companyName: (e.companies as { name: string })?.name ?? '—',
      billingEmail: (e.billing_email as string) ?? '—',
      tier: latestOrder?.product_type ?? 'none',
      totalSpend: orders.reduce((s, o) => s + (o.amount_pence || 0), 0) / 100,
      joinedAt: e.created_at as string,
    }
  })
}

interface RawJob {
  id: string
  title: string
  slug: string
  status: string
  is_featured: boolean
  role_type: string
  posted_at: string
  expires_at: string | null
  view_count: number | null
  application_count: number | null
  source: string
  companies: { name: string } | null
}

export async function getAdminListings() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('jobs')
    .select(
      `id, title, slug, status, is_featured, role_type, posted_at, expires_at, view_count, application_count, source,
       companies(name)`
    )
    .order('posted_at', { ascending: false })
    .limit(200)

  return ((data || []) as unknown as RawJob[]).map((j) => ({
    id: j.id,
    title: j.title,
    slug: j.slug,
    status: j.status,
    isFeatured: j.is_featured,
    roleType: j.role_type,
    source: j.source,
    postedAt: j.posted_at,
    expiresAt: j.expires_at,
    viewCount: j.view_count ?? 0,
    applicationCount: j.application_count ?? 0,
    companyName: j.companies?.name ?? '—',
  }))
}

export async function getAdminCandidates() {
  const supabase = createServiceClient()

  const { count: totalCandidates } = await supabase
    .from('job_seeker_profiles')
    .select('*', { count: 'exact', head: true })

  const { count: withCv } = await supabase
    .from('job_seeker_profiles')
    .select('*', { count: 'exact', head: true })
    .not('cv_url', 'is', null)

  return {
    totalCandidates: totalCandidates ?? 0,
    withCv: withCv ?? 0,
  }
}

export async function getAdminRevenue() {
  const supabase = createServiceClient()

  const { data: orders } = await supabase
    .from('stripe_orders')
    .select('id, amount_pence, product_type, status, created_at, employers(billing_email, companies(name))')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(100)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const paid = orders || []
  const thisMonthOrders = paid.filter((o) => new Date(o.created_at) >= startOfMonth)

  const byTier: Record<string, number> = {}
  for (const o of thisMonthOrders) {
    const t = o.product_type || 'unknown'
    byTier[t] = (byTier[t] || 0) + (o.amount_pence || 0)
  }

  return {
    mrr: thisMonthOrders.reduce((s, o) => s + (o.amount_pence || 0), 0) / 100,
    allTime: paid.reduce((s, o) => s + (o.amount_pence || 0), 0) / 100,
    byTier: Object.entries(byTier).map(([tier, pence]) => ({
      tier,
      amount: pence / 100,
    })),
    recentTransactions: (paid as unknown as Array<{
      id: string
      amount_pence: number | null
      product_type: string | null
      created_at: string
      employers: { billing_email: string; companies: { name: string } | null } | null
    }>).slice(0, 20).map((o) => ({
      id: o.id,
      amount: (o.amount_pence || 0) / 100,
      tier: o.product_type,
      createdAt: o.created_at,
      company: o.employers?.companies?.name ?? '—',
      email: o.employers?.billing_email ?? '—',
    })),
  }
}
