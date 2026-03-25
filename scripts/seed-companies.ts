import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'jobs' } }
)

const seedList = JSON.parse(
  fs.readFileSync('/Users/jamesfowles/.openclaw/workspace-remy/company-seed-list.json', 'utf-8')
)

async function seed() {
  console.log(`Seeding ${seedList.length} companies...`)
  let ok = 0
  let fail = 0

  for (const company of seedList) {
    const slug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await supabase
      .from('companies')
      .upsert({
        name: company.name,
        slug,
        ats_provider: company.ats,
        ats_token: company.token,
        is_employer: false,
      }, { onConflict: 'slug' })

    if (error) {
      console.error(`✗ ${company.name}: ${error.message}`)
      fail++
    } else {
      console.log(`✓ ${company.name} (${company.ats}/${company.token})`)
      ok++
    }
  }

  console.log(`\nDone: ${ok} seeded, ${fail} failed`)
}

seed().catch(console.error)
