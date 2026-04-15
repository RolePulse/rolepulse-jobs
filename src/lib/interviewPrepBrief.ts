type RoleType = 'SDR' | 'AE' | 'AM' | 'CSM' | 'Sales Leadership' | 'RevOps' | 'Partnerships' | 'Enablement' | 'Marketing' | 'Growth'

export interface PrepBrief {
  companyOverview: { name: string; website?: string | null; atsProvider?: string | null } | null
  questions: { question: string; tip: string }[]
  talkingPoints: string[]
}

const ROLE_QUESTIONS: Record<RoleType, { question: string; tip: string }[]> = {
  SDR: [
    { question: 'Walk me through your outbound prospecting process.', tip: 'Structure it: research → personalisation → multi-channel cadence. Include specific metrics (emails/day, connect rate).' },
    { question: 'How do you handle objections early in the sales cycle?', tip: 'Use a real example. Name the objection, your response, and the outcome.' },
    { question: 'What tools do you use for prospecting and why?', tip: 'Mention specific tools (Outreach, Apollo, LinkedIn Sales Nav) and how you use them differently.' },
    { question: 'Tell me about a time you exceeded your quota.', tip: 'Lead with the number, then explain the actions that drove it. Be specific about the delta vs target.' },
  ],
  AE: [
    { question: 'Walk me through a deal you closed from discovery to close.', tip: 'Use a structured narrative: qualification → discovery → demo → negotiation → close. Include deal size and timeline.' },
    { question: 'How do you run a discovery call?', tip: 'Show a methodology (MEDDIC, SPIN, etc.) but explain it naturally, not textbook-style.' },
    { question: 'Describe a deal you lost and what you learned.', tip: 'Show self-awareness. Focus on what you would do differently, not on blaming the prospect.' },
    { question: 'How do you manage a pipeline with multiple deals at different stages?', tip: 'Demonstrate prioritisation and time management. Mention how you forecast accuracy.' },
  ],
  AM: [
    { question: 'How do you identify expansion opportunities in existing accounts?', tip: 'Talk about account mapping, usage patterns, and business triggers that signal growth potential.' },
    { question: 'Describe your approach to QBRs.', tip: 'Show structure: review outcomes, align on goals, identify gaps, propose next steps. Include how you prep.' },
    { question: 'How do you handle a renewal at risk?', tip: 'Show a methodical save plan: identify root cause, escalation path, executive alignment, timeline.' },
    { question: 'Tell me about your largest upsell.', tip: 'Quantify the expansion, explain what triggered it, and how you positioned the additional value.' },
  ],
  CSM: [
    { question: 'How do you measure customer health?', tip: 'Mention specific signals: usage metrics, NPS, support tickets, engagement frequency. Show how you combine them.' },
    { question: 'Describe how you handle an unhappy customer.', tip: 'Show empathy first, then structured problem-solving. Include escalation judgement.' },
    { question: 'How do you drive product adoption after onboarding?', tip: 'Talk about training cadence, success milestones, and how you track feature adoption.' },
    { question: 'Walk me through your approach to reducing churn.', tip: 'Show proactive vs reactive strategies. Include early warning indicators you watch for.' },
  ],
  'Sales Leadership': [
    { question: 'How do you build and scale a sales team?', tip: 'Cover hiring profile, ramp time expectations, enablement, and how you set quota.' },
    { question: 'Describe your forecasting methodology.', tip: 'Show rigour: pipeline coverage ratios, stage-based weighting, deal inspection cadence.' },
    { question: 'How do you handle an underperforming rep?', tip: 'Show coaching approach: diagnose root cause (skill vs will), create a clear PIP with milestones.' },
    { question: 'Tell me about a sales org transformation you led.', tip: 'Quantify the before and after. Cover process, tooling, and people changes.' },
  ],
  RevOps: [
    { question: 'How do you approach CRM data quality?', tip: 'Talk about governance, validation rules, automation, and how you measure data hygiene.' },
    { question: 'Describe a process you automated and its impact.', tip: 'Quantify time saved and error reduction. Explain the before/after workflow.' },
    { question: 'How do you design compensation plans?', tip: 'Cover alignment with business goals, simplicity, accelerators, and how you model scenarios.' },
    { question: 'Walk me through your approach to pipeline reporting.', tip: 'Show depth: conversion rates by stage, velocity metrics, cohort analysis, trend detection.' },
  ],
  Partnerships: [
    { question: 'How do you evaluate and prioritise potential partners?', tip: 'Show a framework: strategic fit, TAM overlap, technical compatibility, partner maturity.' },
    { question: 'Describe a partnership you built from scratch.', tip: 'Cover outreach, alignment, co-selling motion, and how you measured success.' },
    { question: 'How do you manage partner conflicts with direct sales?', tip: 'Show diplomacy and process: rules of engagement, deal registration, escalation paths.' },
    { question: 'What metrics do you use to measure partnership success?', tip: 'Go beyond revenue: sourced vs influenced pipeline, partner-attached win rates, time to first deal.' },
  ],
  Enablement: [
    { question: 'How do you measure the effectiveness of a training programme?', tip: 'Cover leading indicators (completion, knowledge checks) and lagging ones (ramp time, quota attainment).' },
    { question: 'Describe your approach to onboarding new sales reps.', tip: 'Show structure: 30/60/90 plan, shadowing, certification gates, and ongoing coaching.' },
    { question: 'How do you prioritise competing enablement requests?', tip: 'Tie everything back to revenue impact and strategic priorities. Show stakeholder management.' },
    { question: 'Tell me about content you created that measurably improved win rates.', tip: 'Name the asset, the problem it solved, and the before/after metric.' },
  ],
  Marketing: [
    { question: 'How do you approach demand generation strategy?', tip: 'Show full-funnel thinking: awareness channels, conversion tactics, attribution model, budget allocation.' },
    { question: 'Describe a campaign that significantly moved pipeline.', tip: 'Lead with the result, then explain the strategy, execution, and what you would optimise.' },
    { question: 'How do you align marketing with sales?', tip: 'Talk about SLAs, lead scoring criteria, feedback loops, and shared dashboards.' },
    { question: 'What is your approach to marketing attribution?', tip: 'Show nuance: first-touch vs multi-touch, incrementality, and how you use attribution to make decisions.' },
  ],
  Growth: [
    { question: 'Walk me through your experimentation framework.', tip: 'Cover hypothesis formation, prioritisation (ICE/RICE), test design, statistical significance, and documentation.' },
    { question: 'Describe a growth lever you identified and scaled.', tip: 'Show the discovery process, initial test, iteration, and final impact with specific numbers.' },
    { question: 'How do you prioritise growth initiatives?', tip: 'Demonstrate a scoring framework and how you balance quick wins vs structural improvements.' },
    { question: 'What metrics do you focus on and why?', tip: 'Show depth beyond vanity metrics. Talk about north star metric, leading indicators, and cohort analysis.' },
  ],
}

const GENERIC_QUESTIONS: { question: string; tip: string }[] = [
  { question: 'Tell me about yourself.', tip: 'Keep it under 90 seconds. Structure: current role → key achievement → why this opportunity excites you.' },
  { question: 'Why are you interested in this company?', tip: 'Reference something specific: a product feature, recent news, company mission, or market position.' },
  { question: 'What is your biggest professional achievement?', tip: 'Pick one that is relevant to the role. Quantify the impact and explain your specific contribution.' },
  { question: 'Where do you see yourself in 2-3 years?', tip: 'Show ambition that aligns with the role trajectory. Avoid sounding like you will leave quickly.' },
]

export function generatePrepBrief(
  jobTitle: string,
  companyName: string,
  companyInfo: { website?: string | null; ats_provider?: string | null } | null,
  cvAnalysis: { detectedRole: string | null; matchedKeywords: string[]; missingKeywords: string[] } | null,
): PrepBrief {
  const roleType = detectRoleType(jobTitle, cvAnalysis?.detectedRole ?? null)
  const roleQuestions = roleType ? ROLE_QUESTIONS[roleType] ?? [] : []

  const questions = [
    ...roleQuestions.slice(0, 3),
    ...GENERIC_QUESTIONS.slice(0, roleQuestions.length > 0 ? 2 : 4),
  ]

  const talkingPoints: string[] = []

  if (cvAnalysis) {
    if (cvAnalysis.matchedKeywords.length > 0) {
      const top = cvAnalysis.matchedKeywords.slice(0, 5)
      talkingPoints.push(`Your CV aligns well on: ${top.join(', ')}. Prepare concrete examples for each.`)
    }
    if (cvAnalysis.missingKeywords.length > 0) {
      const gaps = cvAnalysis.missingKeywords.slice(0, 4)
      talkingPoints.push(`Gaps to address: ${gaps.join(', ')}. Prepare transferable experience or eagerness to learn.`)
    }
  }

  if (roleType) {
    talkingPoints.push(`This is a ${roleType} role. Prepare metrics specific to ${roleType} performance (e.g. ${getRoleMetricHint(roleType)}).`)
  }

  talkingPoints.push(`Research ${companyName} before the call — check recent news, LinkedIn company page, and Glassdoor.`)

  if (companyInfo?.website) {
    talkingPoints.push(`Visit ${companyInfo.website} and note their product positioning, recent blog posts, or case studies.`)
  }

  return {
    companyOverview: {
      name: companyName,
      website: companyInfo?.website ?? null,
      atsProvider: companyInfo?.ats_provider ?? null,
    },
    questions,
    talkingPoints,
  }
}

function detectRoleType(jobTitle: string, detectedRole: string | null): RoleType | null {
  const text = `${jobTitle} ${detectedRole ?? ''}`
  const patterns: { pattern: RegExp; type: RoleType }[] = [
    { pattern: /\bSDR\b|\bBDR\b|sales development|business development rep/i, type: 'SDR' },
    { pattern: /\bAE\b|account executive/i, type: 'AE' },
    { pattern: /\bAM\b|account manager/i, type: 'AM' },
    { pattern: /\bCSM\b|customer success/i, type: 'CSM' },
    { pattern: /vp of sales|head of sales|sales director|director of sales|sales manager|sales lead/i, type: 'Sales Leadership' },
    { pattern: /\bRevOps\b|revenue operations/i, type: 'RevOps' },
    { pattern: /\bpartnerships?\b|channel manager/i, type: 'Partnerships' },
    { pattern: /\benablement\b|sales enablement/i, type: 'Enablement' },
    { pattern: /\bmarketing\b/i, type: 'Marketing' },
    { pattern: /\bgrowth\b/i, type: 'Growth' },
  ]
  for (const { pattern, type } of patterns) {
    if (pattern.test(text)) return type
  }
  return null
}

function getRoleMetricHint(role: RoleType): string {
  const hints: Record<RoleType, string> = {
    SDR: 'meetings booked, connect rate, pipeline generated',
    AE: 'quota attainment, average deal size, win rate, sales cycle length',
    AM: 'net revenue retention, expansion revenue, account growth rate',
    CSM: 'NPS, churn rate, time to value, health score improvements',
    'Sales Leadership': 'team quota attainment, rep ramp time, forecast accuracy',
    RevOps: 'pipeline velocity, data accuracy, process efficiency gains',
    Partnerships: 'partner-sourced pipeline, co-sell revenue, partner activation rate',
    Enablement: 'ramp time reduction, content adoption, win rate improvement',
    Marketing: 'MQLs generated, CAC, pipeline influenced, campaign ROI',
    Growth: 'activation rate, conversion rate, experiment velocity, retention improvement',
  }
  return hints[role]
}
