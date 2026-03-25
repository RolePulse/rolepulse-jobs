import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: 'jobs' } })

async function main() {
  const { count } = await sb.from('jobs').select('*', { count: 'exact', head: true })
  console.log(`Total jobs in DB: ${count}`)
}
main().catch(console.error)
