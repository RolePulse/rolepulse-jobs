import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_DOMAIN_VERIFIED === 'true'
  ? 'RolePulse <noreply@rolepulse.com>'
  : 'RolePulse <onboarding@resend.dev>'

export async function sendApplicationConfirmation(to: string, roleName: string, companyName: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your application for ${roleName} at ${companyName}`,
    html: `<p>Hi,</p><p>We've received your application for <strong>${roleName}</strong> at <strong>${companyName}</strong>.</p><p>Good luck!</p><p>— The RolePulse team</p>`,
  })
}

export async function sendNewApplicationAlert(to: string, candidateName: string, candidateEmail: string, roleName: string, dashboardUrl: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `New application for ${roleName}`,
    html: `<p>You have a new application for <strong>${roleName}</strong>.</p><p>Candidate: ${candidateName} (${candidateEmail})</p><p><a href="${dashboardUrl}">View in dashboard →</a></p>`,
  })
}

export async function sendJobAlert(to: string, roleType: string, jobs: { title: string; company: string; slug: string }[]) {
  const jobList = jobs.map(j => `<li><a href="https://rolepulse.com/jobs/${j.slug}">${j.title} at ${j.company}</a></li>`).join('')
  return resend.emails.send({
    from: FROM,
    to,
    subject: `${jobs.length} new ${roleType} role${jobs.length > 1 ? 's' : ''} on RolePulse`,
    html: `<p>New ${roleType} roles posted in the last 24 hours:</p><ul>${jobList}</ul><p><a href="https://rolepulse.com/jobs?role=${roleType}">View all ${roleType} roles →</a></p>`,
  })
}
