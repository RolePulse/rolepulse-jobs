import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { STRIPE_PRICES } from '@/lib/stripe/prices'

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'jobs' },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, location, remote, role_type, description, employer_id, tier } = await req.json()

  if (!title || !location || !description) {
    return NextResponse.json({ error: 'Title, location, and description are required' }, { status: 400 })
  }

  const priceKey = tier as keyof typeof STRIPE_PRICES
  const priceConfig = STRIPE_PRICES[priceKey] || STRIPE_PRICES.standard
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`

  // Insert job as pending
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      title,
      slug,
      location,
      remote: remote || false,
      role_type: role_type || null,
      description,
      source: 'employer',
      status: 'pending',
      employer_id,
    })
    .select('id')
    .single()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  // Create Stripe Checkout session
  const stripe = getStripe()
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceConfig.id, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/employers/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/post-a-job`,
    metadata: { job_id: job.id, employer_id },
  })

  // Record order
  await supabase.from('stripe_orders').insert({
    employer_id,
    job_id: job.id,
    stripe_session_id: checkout.id,
    price_id: priceConfig.id,
    amount_total: priceConfig.price * 100,
    status: 'pending',
  })

  return NextResponse.json({ url: checkout.url })
}
