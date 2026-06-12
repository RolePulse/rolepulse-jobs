import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

function getFrom() {
  return process.env.RESEND_DOMAIN_VERIFIED === 'true'
    ? 'RolePulse <noreply@rolepulse.com>'
    : 'RolePulse <onboarding@resend.dev>'
}

export async function sendApplicationConfirmation(to: string, roleName: string, companyName: string) {
  return getResend().emails.send({
    from: getFrom(),
    to,
    subject: `Your application for ${roleName} at ${companyName}`,
    html: `<p>Hi,</p><p>We've received your application for <strong>${roleName}</strong> at <strong>${companyName}</strong>.</p><p>Good luck!</p><p>— The RolePulse team</p>`,
  })
}

export async function sendNewApplicationAlert(to: string, candidateName: string, candidateEmail: string, roleName: string, dashboardUrl: string) {
  return getResend().emails.send({
    from: getFrom(),
    to,
    subject: `New application for ${roleName}`,
    html: `<p>You have a new application for <strong>${roleName}</strong>.</p><p>Candidate: ${candidateName} (${candidateEmail})</p><p><a href="${dashboardUrl}">View in dashboard →</a></p>`,
  })
}

export async function sendNewsletterSponsorshipAlert(job: {
  title: string
  company: string
  location: string | null
  remote: boolean
  slug: string
  amountPence: number
}) {
  // Where to alert James so he can add the role to the Substack. Comma-separated env override supported.
  const to = (process.env.NEWSLETTER_NOTIFY_EMAIL || 'james@rolepulse.com').split(',').map(s => s.trim())
  const amount = `$${(job.amountPence / 100).toFixed(0)}`
  const where = [job.location, job.remote ? 'Remote' : null].filter(Boolean).join(' · ') || '—'
  return getResend().emails.send({
    from: getFrom(),
    to,
    subject: `Newsletter sponsorship paid: ${job.title} at ${job.company}`,
    html: `<p>A company just bought the <strong>Newsletter</strong> tier (${amount}). Add this role to the next Substack:</p>
<ul>
<li><strong>Role:</strong> ${job.title}</li>
<li><strong>Company:</strong> ${job.company}</li>
<li><strong>Location:</strong> ${where}</li>
<li><strong>Live listing:</strong> <a href="https://rolepulse.com/jobs/${job.slug}">rolepulse.com/jobs/${job.slug}</a></li>
</ul>`,
  })
}

export async function sendFollowUpReminder(
  to: string,
  items: { jobTitle: string; companyName: string; followUpDate: string; followUpNote: string | null }[],
  pipelineUrl: string,
) {
  const rows = items.map(i => {
    const note = i.followUpNote ? ` <span style="color:#71717a">(${i.followUpNote})</span>` : ''
    return `<li style="margin-bottom:6px"><strong>${i.jobTitle}</strong> at <strong>${i.companyName}</strong>, due ${i.followUpDate}${note}</li>`
  }).join('')
  const count = items.length
  return getResend().emails.send({
    from: getFrom(),
    to,
    subject: count === 1
      ? `Follow-up due: ${items[0].jobTitle} at ${items[0].companyName}`
      : `${count} follow-ups due in your pipeline`,
    html: `<p>Hi,</p>
<p>You asked RolePulse to remind you about ${count === 1 ? 'this application' : 'these applications'}:</p>
<ul>${rows}</ul>
<p><a href="${pipelineUrl}">Open your pipeline →</a></p>
<p>To stop a reminder, clear or move the follow-up date on the card.</p>
<p>— The RolePulse team</p>`,
  })
}

export async function sendJobAlert(to: string, roleType: string, jobs: { title: string; company: string; slug: string }[]) {
  const jobList = jobs.map(j => `<li><a href="https://rolepulse.com/jobs/${j.slug}">${j.title} at ${j.company}</a></li>`).join('')
  return getResend().emails.send({
    from: getFrom(),
    to,
    subject: `${jobs.length} new ${roleType} role${jobs.length > 1 ? 's' : ''} on RolePulse`,
    html: `<p>New ${roleType} roles posted in the last 24 hours:</p><ul>${jobList}</ul><p><a href="https://rolepulse.com/jobs?role=${roleType}">View all ${roleType} roles →</a></p>`,
  })
}

export async function sendIngestionStaleAlert(
  to: string,
  details: {
    lastRunAt: string | null
    runAgeHours: number | null
    newestJobSeenAt: string | null
    jobAgeHours: number | null
    activeJobs: number
  }
) {
  const fmt = (ts: string | null) => (ts ? new Date(ts).toUTCString() : 'never')
  return getResend().emails.send({
    from: getFrom(),
    to,
    subject: '⚠️ RolePulse job ingestion is stale',
    html: `<p>The job ingestion pipeline has not refreshed the board recently.</p>
<ul>
<li>Last ingestion run: <strong>${fmt(details.lastRunAt)}</strong>${details.runAgeHours != null ? ` (${details.runAgeHours}h ago)` : ''}</li>
<li>Newest active job seen: <strong>${fmt(details.newestJobSeenAt)}</strong>${details.jobAgeHours != null ? ` (${details.jobAgeHours}h ago)` : ''}</li>
<li>Active jobs on the board: <strong>${details.activeJobs}</strong></li>
</ul>
<p>The ingest workflow runs every 6 hours from GitHub Actions. Check recent runs:</p>
<p><a href="https://github.com/RolePulse/rolepulse-jobs/actions/workflows/ingest.yml">GitHub Actions → Ingest jobs</a></p>
<p>— RolePulse ops</p>`,
  })
}
