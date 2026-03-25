import { runIngestion } from '../src/lib/ingestion/ingest'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

console.log('Starting ingestion pipeline...\n')

runIngestion().then((result) => {
  if (!result) { console.log('No result returned'); process.exit(1) }
  console.log(`\n✅ Done!`)
  console.log(`   Jobs ingested: ${result.totalInserted}`)
  console.log(`   Jobs expired:  ${result.totalExpired}`)
  const errCount = Object.keys(result.errors).length
  if (errCount > 0) {
    console.log(`   Errors (${errCount}):`)
    for (const [name, err] of Object.entries(result.errors)) {
      console.log(`     ✗ ${name}: ${err}`)
    }
  }
}).catch(console.error)
