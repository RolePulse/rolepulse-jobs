import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    // Auth check using user's session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { companyName, website, billingEmail } = body

    if (!companyName || !billingEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Use service client to bypass RLS for company/employer creation
    const service = createServiceClient()

    // Find or create company
    let companyId: string

    const { data: existingCompany } = await service
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingCompany) {
      companyId = existingCompany.id
    } else {
      const { data: newCompany, error: companyError } = await service
        .from('companies')
        .insert({
          name: companyName,
          slug,
          website: website || null,
          is_employer: true,
          ats_provider: 'employer',
        })
        .select('id')
        .single()

      if (companyError || !newCompany) {
        console.error('create company error:', companyError?.message)
        return NextResponse.json({ error: companyError?.message || 'Failed to create company' }, { status: 500 })
      }
      companyId = newCompany.id
    }

    // Upsert employer record
    const { data: employer, error: employerError } = await service
      .from('employers')
      .upsert(
        {
          company_id: companyId,
          user_id: user.id,
          billing_email: billingEmail,
        },
        { onConflict: 'user_id' }
      )
      .select('id')
      .single()

    if (employerError || !employer) {
      console.error('create employer error:', employerError?.message)
      return NextResponse.json({ error: employerError?.message || 'Failed to create employer account' }, { status: 500 })
    }

    return NextResponse.json({ employer_id: employer.id, company_id: companyId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('employer/create error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
