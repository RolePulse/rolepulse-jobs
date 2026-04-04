import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'jobs' } }
)

async function main() {
  const { data, error, count } = await supabase
    .from('companies')
    .select('name,ats_provider,ats_token,is_employer', { count: 'exact' })
    .eq('is_employer', false)
    .order('name')

  if (error) {
    console.error('Error:', error.message)
    return
  }
  console.log(`Total non-employer companies: ${count}`)
  data?.forEach(c => console.log(`${c.name} | ${c.ats_provider} | ${c.ats_token}`))
}

main().catch(console.error)
