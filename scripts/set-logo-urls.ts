/**
 * set-logo-urls.ts
 * Sets Clearbit logo URLs directly for known companies without HTTP checking.
 * Use when the sandbox can't reach Clearbit (DNS restrictions).
 * Run: npx tsx scripts/set-logo-urls.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'jobs' } }
  )
}

// Domain map covering all 50 seed companies
const DOMAIN_MAP: Record<string, string> = {
  'HubSpot': 'hubspot.com',
  'Salesforce': 'salesforce.com',
  'Salesloft': 'salesloft.com',
  'SalesLoft': 'salesloft.com',
  'Apollo.io': 'apollo.io',
  'Intercom': 'intercom.com',
  'Outreach': 'outreach.io',
  'Gong': 'gong.io',
  'ZoomInfo': 'zoominfo.com',
  'Seismic': 'seismic.com',
  'Highspot': 'highspot.com',
  'Drift': 'drift.com',
  '6sense': '6sense.com',
  'Demandbase': 'demandbase.com',
  'Clari': 'clari.com',
  'Chorus.ai': 'chorus.ai',
  'Gainsight': 'gainsight.com',
  'Totango': 'totango.com',
  'ChurnZero': 'churnzero.com',
  'Mixpanel': 'mixpanel.com',
  'Amplitude': 'amplitude.com',
  'Segment': 'segment.com',
  'Braze': 'braze.com',
  'Iterable': 'iterable.com',
  'Klaviyo': 'klaviyo.com',
  'Marketo': 'marketo.com',
  'Pardot': 'pardot.com',
  'Groove': 'groove.co',
  'Yesware': 'yesware.com',
  'Lusha': 'lusha.com',
  'Cognism': 'cognism.com',
  'Clay': 'clay.com',
  'Lavender': 'lavender.ai',
  'Loom': 'loom.com',
  'Miro': 'miro.com',
  'Notion': 'notion.so',
  'Linear': 'linear.app',
  'Figma': 'figma.com',
  'Stripe': 'stripe.com',
  'Checkout.com': 'checkout.com',
  'Adyen': 'adyen.com',
  'Rippling': 'rippling.com',
  'Lattice': 'lattice.com',
  'Greenhouse': 'greenhouse.io',
  'Lever': 'lever.co',
  'Ashby': 'ashby.com',
  'Retool': 'retool.com',
  'Coda': 'coda.io',
  'Close': 'close.com',
  'Pipedrive': 'pipedrive.com',
  'Copper': 'copper.com',
  'Attentive': 'attentive.com',
  'Yotpo': 'yotpo.com',
  'Vercel': 'vercel.com',
  'Datadog': 'datadoghq.com',
  'Twilio': 'twilio.com',
  'Pendo': 'pendo.io',
  'Showpad': 'showpad.com',
  'Calendly': 'calendly.com',
  'PandaDoc': 'pandadoc.com',
  'Zuora': 'zuora.com',
  'Snowflake': 'snowflake.com',
  'Qualified': 'qualified.com',
  'Chili Piper': 'chilipiper.com',
  'Lemlist': 'lemlist.com',
  'Asana': 'asana.com',
  'Notion Calendar': 'notion.so',
  'Contentful': 'contentful.com',
  'Monday.com': 'monday.com',
  'ClickUp': 'clickup.com',
  'Sprinklr': 'sprinklr.com',
  'UserTesting': 'usertesting.com',
}

async function setLogoUrls() {
  const supabase = getSupabase()

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, domain')
    .is('logo_url', null)

  if (error) {
    console.error('Failed to fetch companies:', error.message)
    process.exit(1)
  }

  console.log(`Found ${companies?.length || 0} companies without logos`)

  let updated = 0
  let noDomain = 0

  for (const company of companies || []) {
    const domain = company.domain || DOMAIN_MAP[company.name]

    if (!domain) {
      console.log(`  ⚠️  No domain for: ${company.name}`)
      noDomain++
      continue
    }

    const logoUrl = `https://logo.clearbit.com/${domain}`

    const { error: updateError } = await supabase
      .from('companies')
      .update({ logo_url: logoUrl, domain })
      .eq('id', company.id)

    if (updateError) {
      console.error(`  ✗ Failed to update ${company.name}:`, updateError.message)
    } else {
      console.log(`  ✓ ${company.name} → ${logoUrl}`)
      updated++
    }
  }

  console.log(`\nDone. Updated: ${updated}, No domain: ${noDomain}`)
}

setLogoUrls().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
