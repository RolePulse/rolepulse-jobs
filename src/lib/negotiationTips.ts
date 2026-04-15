type Position = "below" | "at" | "above"

export interface NegotiationTip {
  icon: string
  title: string
  body: string
}

const belowMarketTips: NegotiationTip[] = [
  {
    icon: "📊",
    title: "Lead with data, not feelings",
    body: "Say: \"Based on market data for this role in this region, the typical range is [X\u2013Y]. I\u2019d love to discuss how we can get closer to that.\" Framing it as market reality, not personal worth, keeps the conversation professional.",
  },
  {
    icon: "🎯",
    title: "Anchor on your value, not the gap",
    body: "Highlight 2-3 specific results from your track record that justify higher comp. \"In my last role I [achievement] which directly drove [outcome].\" This shifts the conversation from cost to ROI.",
  },
  {
    icon: "💡",
    title: "Explore the full package",
    body: "If base is fixed, negotiate other levers: signing bonus, accelerated review at 6 months, additional equity, guaranteed commission floor for ramp period, or professional development budget.",
  },
  {
    icon: "⏰",
    title: "Ask for a timeline commitment",
    body: "\"If the budget is constrained right now, can we agree to a salary review after 6 months with a target of [X]?\" This shows flexibility while protecting your long-term earning potential.",
  },
]

const atMarketTips: NegotiationTip[] = [
  {
    icon: "✅",
    title: "Solid offer \u2014 now look beyond base",
    body: "Your base is competitive. Focus negotiation on equity/stock options, signing bonus, remote flexibility, or start date. These are often easier for employers to flex on than base salary.",
  },
  {
    icon: "📈",
    title: "Negotiate your review cycle",
    body: "Ask for a 6-month performance review with a salary adjustment clause instead of waiting 12 months. This is low-risk for the employer and high-upside for you.",
  },
  {
    icon: "🏠",
    title: "Push on flexibility",
    body: "Remote days, compressed hours, or home-office budget can be worth thousands annually. If the role is hybrid, ask whether a fully remote arrangement is possible after the first 3 months.",
  },
  {
    icon: "🎓",
    title: "Ask for development budget",
    body: "Conference tickets, courses, coaching, or certification budgets are often approved more easily than salary bumps. Frame it as investing in your ramp speed and long-term contribution.",
  },
]

const aboveMarketTips: NegotiationTip[] = [
  {
    icon: "🏆",
    title: "Strong offer \u2014 you have leverage",
    body: "This offer is above market. That means they really want you. Use this position to negotiate the terms that matter most to your quality of life \u2014 remote work, start date, role scope.",
  },
  {
    icon: "🔍",
    title: "Understand the expectation",
    body: "Above-market comp usually comes with above-market expectations. Ask: \"What does success look like in the first 6 months?\" and \"What are the key metrics I\u2019ll be measured on?\" Make sure you\u2019re set up to deliver.",
  },
  {
    icon: "📝",
    title: "Get everything in writing",
    body: "Confirm base, OTE structure, commission plan details, equity vesting schedule, clawback clauses, and notice period. If there\u2019s a commission accelerator, understand exactly when it kicks in.",
  },
]

export function getNegotiationTips(position: Position): NegotiationTip[] {
  switch (position) {
    case "below": return belowMarketTips
    case "at": return atMarketTips
    case "above": return aboveMarketTips
  }
}
