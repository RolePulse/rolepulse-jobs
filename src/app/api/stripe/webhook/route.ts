import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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

    // Activate the job
    await supabase
      .from('jobs')
      .update({
        status: 'active',
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
  }

  return NextResponse.json({ received: true })
}
