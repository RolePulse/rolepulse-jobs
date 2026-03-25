import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { Resend } from 'resend'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'jobs' } }
  )
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const jobId = session.metadata?.job_id
    const employerId = session.metadata?.employer_id

    if (!jobId || !employerId) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Update order status
    await supabase
      .from('stripe_orders')
      .update({ status: 'paid' })
      .eq('stripe_session_id', session.id)

    // Activate the job
    await supabase
      .from('jobs')
      .update({
        status: 'active',
        posted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', jobId)

    // Get employer billing email for confirmation
    const { data: employer } = await supabase
      .from('employers')
      .select('billing_email')
      .eq('id', employerId)
      .single()

    if (employer?.billing_email) {
      const resend = getResend()
      await resend.emails.send({
        from: 'noreply@rolepulse.com',
        to: employer.billing_email,
        subject: 'Your job listing is now live on RolePulse',
        text: 'Your job listing is now live on RolePulse. Thanks for posting with us!',
      })
    }
  }

  return NextResponse.json({ received: true })
}
