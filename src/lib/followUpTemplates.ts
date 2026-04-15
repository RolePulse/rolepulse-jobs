type RoleCategory = 'sales' | 'cs' | 'marketing' | 'revops' | 'general'

function classifyRole(title: string): RoleCategory {
  const t = title.toLowerCase()
  if (/\b(sdr|bdr|ae|account executive|sales|business development)\b/.test(t)) return 'sales'
  if (/\b(csm|customer success|account manager|client)\b/.test(t)) return 'cs'
  if (/\b(market|growth|demand gen|content|brand|comms|pr)\b/.test(t)) return 'marketing'
  if (/\b(rev.?ops|sales.?ops|go.?to.?market|enablement|ops)\b/.test(t)) return 'revops'
  return 'general'
}

interface TemplateVars {
  companyName: string
  jobTitle: string
}

function fill(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{company\}/g, vars.companyName)
    .replace(/\{role\}/g, vars.jobTitle)
}

const appliedFollowUp: Record<RoleCategory, string> = {
  sales: `Hi — I applied for the {role} position at {company} last week and wanted to follow up. I've spent the last few years building pipeline and closing in SaaS, and I'm confident I can make an impact on your team. Happy to jump on a quick call if helpful.`,
  cs: `Hi — I applied for the {role} role at {company} recently and wanted to check in. My background is in customer success and retention within SaaS, and I'd love to chat about how I can help your team drive outcomes. Let me know if there's a good time.`,
  marketing: `Hi — I applied for the {role} position at {company} and wanted to follow up. I've been working across demand gen and content in B2B, and I'm excited about what your team is building. Would love to have a conversation when you have a moment.`,
  revops: `Hi — I applied for the {role} role at {company} and wanted to touch base. I've been deep in GTM operations and tooling, and I think there's a strong fit here. Happy to chat at your convenience.`,
  general: `Hi — I applied for the {role} position at {company} recently and wanted to follow up. I'm very interested in the role and believe my experience is a strong fit. Please let me know if there's any additional information I can provide.`,
}

const firstCallThankYou: Record<RoleCategory, string> = {
  sales: `Thanks for taking the time to chat today about the {role} role at {company}. I enjoyed learning about the team's targets and GTM motion. I'm excited about the opportunity and keen to move forward. Let me know what the next steps look like.`,
  cs: `Thanks for the conversation today about the {role} position at {company}. It was great to hear about your approach to customer outcomes and how the team is structured. I'm genuinely excited about the role — please let me know the next steps.`,
  marketing: `Thanks for the call today about the {role} role at {company}. I really enjoyed hearing about your marketing strategy and where the team is headed. I'd love to continue the conversation — just let me know what comes next.`,
  revops: `Thanks for chatting today about the {role} role at {company}. I appreciated the detail on your current stack and process challenges. I'm confident I can contribute meaningfully here. Looking forward to next steps.`,
  general: `Thanks for taking the time to speak with me today about the {role} role at {company}. I enjoyed learning more about the team and the opportunity. I'm very interested in moving forward — please let me know the next steps.`,
}

const interviewCheckIn: Record<RoleCategory, string> = {
  sales: `Hi — I wanted to check in following our recent conversations about the {role} role at {company}. I'm still very keen and have been thinking about how I'd approach ramping into your market. Happy to discuss further, and just wanted to ask about timeline for next steps.`,
  cs: `Hi — just checking in on the {role} opportunity at {company}. I've been reflecting on our discussions and I'm excited about the chance to work with your customer base. Could you share an update on the timeline?`,
  marketing: `Hi — following up on the {role} role at {company}. I've really enjoyed the process so far and remain very interested. Would love to know where things stand and what the next steps look like.`,
  revops: `Hi — wanted to check in on the {role} position at {company}. I've been thinking about the operational challenges we discussed and have some ideas I'd love to share. Any update on timing for the next stage?`,
  general: `Hi — I wanted to follow up on the {role} opportunity at {company}. I've enjoyed the process and remain very interested. Could you let me know the expected timeline for next steps?`,
}

export interface FollowUpTemplate {
  label: string
  text: string
}

export function getFollowUpTemplate(
  scenario: 'applied_followup' | 'first_call_thanks' | 'interview_checkin',
  jobTitle: string,
  companyName: string,
): FollowUpTemplate {
  const role = classifyRole(jobTitle)
  const vars: TemplateVars = { companyName, jobTitle }

  switch (scenario) {
    case 'applied_followup':
      return { label: 'Follow-up email', text: fill(appliedFollowUp[role], vars) }
    case 'first_call_thanks':
      return { label: 'Thank-you message', text: fill(firstCallThankYou[role], vars) }
    case 'interview_checkin':
      return { label: 'Check-in message', text: fill(interviewCheckIn[role], vars) }
  }
}
