import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, location, remote, role_type, description, employer_id, company_id, price_id, tier } = body

    // Validate
    if (!title || !role_type || !description || !employer_id || !company_id || !price_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get company name for slug
    const { data: company } = await supabase
      .from('companies')
      .select('name, slug')
      .eq('id', company_id)
      .single()

    const baseSlug = slugify(`${title}-${company?.slug || 'employer'}-${Date.now()}`)

    // Insert job as pending (will be activated on Stripe webhook)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id,
        title,
        slug: baseSlug,
        location,
        remote,
        role_type,
        description,
        source: 'employer',
        status: 'pending',
      })
      .select('id')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: jobError?.message || 'Failed to create job' }, { status: 500 })
    }

    // Create Stripe Checkout session
    const stripe = getStripe()
    const origin = req.headers.get('origin') || 'https://rolepulse.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${origin}/employers/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/post-a-job`,
      metadata: {
        job_id: job.id,
        employer_id,
        company_id,
        tier,
      },
    })

    // Save stripe order
    await supabase.from('stripe_orders').insert({
      employer_id,
      job_id: job.id,
      stripe_session_id: session.id,
      product_type: tier,
      status: 'pending',
    })

    return NextResponse.json({ checkout_url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('employer/post error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
