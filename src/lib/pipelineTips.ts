import { getFollowUpTemplate, type FollowUpTemplate } from './followUpTemplates'

type Stage = 'saved' | 'applied' | 'first_call' | 'interviewing' | 'offer' | 'closed'

export interface Tip {
  icon: string
  title: string
  body: string
  priority: 'high' | 'medium' | 'low'
  template?: FollowUpTemplate
}

export interface TipContext {
  stage: Stage
  stageDetail?: string | null
  matchScore?: number | null
  daysSinceCreated: number
  daysSinceStageChange: number
  hasFollowUp: boolean
  followUpOverdue: boolean
  hasCv: boolean
  hasJobUrl: boolean
  jobTitle?: string
  companyName?: string
}

function savedTips(ctx: TipContext): Tip[] {
  const tips: Tip[] = []

  if (ctx.matchScore != null && ctx.matchScore < 70) {
    tips.push({
      icon: '🎯',
      title: 'Boost your match score before applying',
      body: `Your CV scores ${ctx.matchScore}% for this role. Open the job listing and check the scorer panel for specific fixes — focus on missing keywords and quantified results.`,
      priority: 'high',
    })
  } else if (ctx.matchScore != null && ctx.matchScore >= 70) {
    tips.push({
      icon: '✅',
      title: 'Strong match — ready to apply',
      body: `Your CV scores ${ctx.matchScore}% for this role. That clears the recruiter threshold. Apply now while the listing is fresh.`,
      priority: 'medium',
    })
  }

  if (!ctx.hasCv) {
    tips.push({
      icon: '📄',
      title: 'Upload your CV first',
      body: 'You haven\'t uploaded a CV yet. Go to your profile and upload one so we can score your fit for this role.',
      priority: 'high',
    })
  }

  if (ctx.daysSinceCreated > 5) {
    tips.push({
      icon: '⏰',
      title: 'Don\'t sit on this too long',
      body: 'You saved this role ' + ctx.daysSinceCreated + ' days ago. Roles typically get 50+ applications in the first week. If you\'re interested, apply soon.',
      priority: 'medium',
    })
  }

  if (tips.length === 0) {
    tips.push({
      icon: '💡',
      title: 'Research the company before applying',
      body: 'Check their LinkedIn, recent news, and Glassdoor reviews. Tailor your cover note to show you understand what they do.',
      priority: 'low',
    })
  }

  return tips
}

function appliedTips(ctx: TipContext): Tip[] {
  const tips: Tip[] = []

  if (ctx.daysSinceStageChange <= 2) {
    tips.push({
      icon: '📬',
      title: 'Application submitted — now prepare',
      body: 'Most recruiters review applications within 3-5 business days. Use this time to research the company and prep your elevator pitch.',
      priority: 'medium',
    })
  }

  if (ctx.daysSinceStageChange >= 5 && ctx.daysSinceStageChange < 10 && !ctx.hasFollowUp) {
    tips.push({
      icon: '📧',
      title: 'Time to follow up',
      body: 'It\'s been ' + ctx.daysSinceStageChange + ' days since you applied. Send a short follow-up to the recruiter or hiring manager. Here\'s a template you can copy and personalise.',
      priority: 'high',
      template: ctx.jobTitle && ctx.companyName
        ? getFollowUpTemplate('applied_followup', ctx.jobTitle, ctx.companyName)
        : undefined,
    })
  }

  if (ctx.daysSinceStageChange >= 10) {
    tips.push({
      icon: '🔄',
      title: 'Consider a second follow-up or move on',
      body: 'It\'s been ' + ctx.daysSinceStageChange + ' days with no response. Try one more reach-out via LinkedIn. If nothing after that, focus energy on other applications.',
      priority: 'medium',
    })
  }

  if (ctx.followUpOverdue) {
    tips.push({
      icon: '⚠️',
      title: 'Follow-up is overdue',
      body: 'You set a follow-up reminder that\'s now past due. Take action today or update the date.',
      priority: 'high',
    })
  }

  return tips
}

function firstCallTips(ctx: TipContext): Tip[] {
  const tips: Tip[] = [
    {
      icon: '🎤',
      title: 'Prep your 90-second pitch',
      body: 'The recruiter will ask "tell me about yourself." Structure it: current role + key achievement + why this opportunity. Keep it under 90 seconds.',
      priority: 'high',
    },
    {
      icon: '❓',
      title: 'Prepare 3 smart questions',
      body: 'Ask about: team structure, what success looks like in 6 months, and their biggest challenge right now. Avoid salary on the first call.',
      priority: 'medium',
    },
    {
      icon: '🔍',
      title: 'Research the interviewer',
      body: 'Find the recruiter or hiring manager on LinkedIn. Note their background and how long they\'ve been at the company. This context helps you build rapport.',
      priority: 'medium',
    },
  ]

  if (ctx.daysSinceStageChange >= 3 && !ctx.hasFollowUp) {
    tips.push({
      icon: '✉️',
      title: 'Send a thank-you note',
      body: 'It\'s been ' + ctx.daysSinceStageChange + ' days since the first call. If you haven\'t already, send a thank-you that references something specific from the conversation.',
      priority: 'high',
      template: ctx.jobTitle && ctx.companyName
        ? getFollowUpTemplate('first_call_thanks', ctx.jobTitle, ctx.companyName)
        : undefined,
    })
  }

  return tips
}

function interviewingTips(ctx: TipContext): Tip[] {
  const tips: Tip[] = [
    {
      icon: '📊',
      title: 'Lead with numbers',
      body: 'For every achievement you mention, attach a metric. "Grew pipeline" becomes "Grew pipeline from $0 to $1.2M in 9 months." Specifics beat generalities.',
      priority: 'high',
    },
    {
      icon: '🏆',
      title: 'Prepare your STAR stories',
      body: 'Have 3-4 stories ready using Situation, Task, Action, Result. Cover: biggest deal, toughest objection, team collaboration, and a failure you learned from.',
      priority: 'high',
    },
  ]

  if (ctx.daysSinceStageChange > 7 && !ctx.hasFollowUp) {
    tips.push({
      icon: '📧',
      title: 'Check in on next steps',
      body: 'It\'s been ' + ctx.daysSinceStageChange + ' days in the interview stage. Send a brief check-in to keep the momentum going.',
      priority: 'medium',
      template: ctx.jobTitle && ctx.companyName
        ? getFollowUpTemplate('interview_checkin', ctx.jobTitle, ctx.companyName)
        : undefined,
    })
  }

  return tips
}

function offerTips(_ctx: TipContext): Tip[] {
  return [
    {
      icon: '🎉',
      title: 'You got an offer — don\'t rush',
      body: 'Ask for the full details in writing. You should have: base salary, OTE/bonus, equity, start date, and benefits. It\'s completely normal to take 2-3 days to review.',
      priority: 'high',
    },
    {
      icon: '💰',
      title: 'Log the offer details',
      body: 'Enter the salary details below so we can benchmark this against market rates for similar roles.',
      priority: 'high',
    },
    {
      icon: '🤝',
      title: 'Always negotiate',
      body: 'Even if the offer is good, negotiate. Common levers beyond base: signing bonus, equity, start date, remote flexibility, professional development budget.',
      priority: 'medium',
    },
  ]
}

function closedTips(ctx: TipContext): Tip[] {
  if (ctx.stageDetail === 'accepted') {
    return [{
      icon: '🎉',
      title: 'Congratulations!',
      body: 'You landed the role. Before you start, connect with your new team on LinkedIn and ask your manager what you can read or prep before day one.',
      priority: 'low',
    }]
  }

  if (ctx.stageDetail === 'rejected') {
    return [
      {
        icon: '💪',
        title: 'Ask for feedback',
        body: 'Reply to the rejection and ask: "I\'d really appreciate any feedback on how I could improve." Most won\'t respond, but when they do, it\'s gold.',
        priority: 'medium',
      },
      {
        icon: '📝',
        title: 'Note what you\'d do differently',
        body: 'Add a note on this card about what went well and what you\'d change. This turns every rejection into prep for the next one.',
        priority: 'low',
      },
    ]
  }

  return [{
    icon: '🔄',
    title: 'Keep momentum',
    body: 'This one didn\'t work out, but your pipeline is active. Focus energy on your other applications.',
    priority: 'low',
  }]
}

export function getTipsForStage(ctx: TipContext): Tip[] {
  switch (ctx.stage) {
    case 'saved': return savedTips(ctx)
    case 'applied': return appliedTips(ctx)
    case 'first_call': return firstCallTips(ctx)
    case 'interviewing': return interviewingTips(ctx)
    case 'offer': return offerTips(ctx)
    case 'closed': return closedTips(ctx)
    default: return []
  }
}
