import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { track } from '@/lib/analytics'
import { sendNewsletterSponsorshipAlert } from '@/lib/email'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

function getAdminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'jobs' } }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  const stripe = getStripe()

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error'
    console.error('Stripe webhook signature error:', message)
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { job_id, employer_id } = session.metadata || {}

    if (!job_id) {
      console.error('Webhook: missing job_id in metadata')
      return NextResponse.json({ received: true })
    }

    const supabase = getAdminSupabase()

    const tier = (session.metadata?.tier ?? '').toLowerCase()
    const isNewsletter = tier === 'newsletter'
    const isFeatured = tier === 'featured' || isNewsletter

    // Activate the job
    await supabase
      .from('jobs')
      .update({
        status: 'active',
        is_featured: isFeatured,
        posted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', job_id)

    // Update stripe order
    await supabase
      .from('stripe_orders')
      .update({
        status: 'paid',
        stripe_payment_intent: session.payment_intent as string,
        amount_pence: session.amount_total || 0,
      })
      .eq('stripe_session_id', session.id)

    // Update employer with stripe customer id
    if (employer_id && session.customer) {
      await supabase
        .from('employers')
        .update({ stripe_customer_id: session.customer as string })
        .eq('id', employer_id)
    }

    console.log(`Job ${job_id} activated via Stripe session ${session.id}`)

    // Newsletter tier: alert James so he can add the role to the Substack.
    if (isNewsletter) {
      const { data: job } = await supabase
        .from('jobs')
        .select('title, slug, location, remote, companies(name)')
        .eq('id', job_id)
        .single()
      if (job) {
        const company = Array.isArray(job.companies) ? job.companies[0] : job.companies
        await sendNewsletterSponsorshipAlert({
          title: job.title,
          company: company?.name ?? 'Unknown company',
          location: job.location ?? null,
          remote: job.remote ?? false,
          slug: job.slug,
          amountPence: session.amount_total || 0,
        }).catch((err) => console.error('Newsletter alert email failed:', err))
      }
    }

    await track('rolepulse.employer_posted_job', {
      tier: tier || 'unknown',
      newsletter_bundle: isNewsletter,
    }, { userId: employer_id ?? undefined })
  }

  return NextResponse.json({ received: true })
}
