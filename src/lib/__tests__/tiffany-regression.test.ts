// Regression test for the "crypto/growth marketer gets irrelevant Strong
// matches" bug.
//
// Background: Tiffany Huang (web3 growth & marketing leader — Magic Eden Head of
// Marketing / GTM Director / Growth Business Lead) was shown "9 strong matches"
// on /jobs that were almost all wrong: Sales Recruiter, Growth Data Science,
// Product Data Scientist, Product Manager, PE Partnerships. Cause:
//   1. classifyCv() returned null for her CV — CV_FAMILY_KEYWORDS was
//      SaaS-centric (MQL/ABM/demand gen) and missed growth/web3/general
//      marketing language, so she hit < 2 keywords in any family. With no CV
//      family, the family-distance penalty was 0 for every job.
//   2. Even with a CV family, many of those titles (data science, product
//      management, recruiting) sit outside the 8-family GTM taxonomy, so the
//      job side also classified to null → still no penalty.
//
// Fix:
//   1. Enrich the marketing keyword/title dictionaries so growth/community/PR
//      marketers classify as `marketing`.
//   2. Add a non-GTM role penalty (isNonGtmRole) that demotes leaked non-GTM
//      titles to "Partial" at best for a candidate with a confident GTM family.
//
// Run with: bun test src/lib/__tests__/tiffany-regression.test.ts

import { describe, it, expect } from 'bun:test'
import {
  compositeScore,
  classifyCv,
  classifyRole,
} from '../matchScoring'

// Tiffany Huang's real CV text (the one used to reproduce the bug).
const TIFFANY_CV = `Tiffany Huang 0xtiffanyx@gmail.com · 001 123 4568 484 · linkedin.com/in/theophana
EXPERIENCE
Growth Business Lead 1/25 – Current
Magic Eden
– Transformed community engagement; led a 190K+ member Discord community and doubled messages sent per user to 40 messages pp; invented a community funnel focused on user activation programs
– Partnered with product and engineering to spearhead ME's trading loyalty program for stakers; grew staked wallets by 35% to 47K, increased $ME staked value by 25% to 20M $ME total, oversaw $30M+in airdrops
– Cut fat PR agency spend and grew CEO's X followers by 65% through founder led marketing. Turned ME into a broadcast channel (2M+ views), instituted regimen for CEO to churn out content by channeling rap culture
$ME Token Launch Go To Market Director 6/24 – 1/25
Magic Eden
– Generated significant attention as #1 Kaito mindshare project consistently pre-TGE; grew Foundation account 100K+ followers, eclipsing Magic Eden's main handle at times; led narrative for ME as onchain Binance
– Helped get +30% of $ME volume being traded on Upbit through aggressive international expansion efforts, including strong narrative propagation among KOLs, partnerships with local platforms, and media campaigns
Marketplace General Manager 5/23 – 5/24
Magic Eden
– Fixed business performance in Solana NFTs; recovered market share from <0% to 60%+ through product improvements, rewards, and aggressive dominance on driving BD deals (we won most deals)
Head of Marketing 10/21 – 5/23
Magic Eden
– Joined as 2nd hire, led ME's marketing team from small Solana NFT marketplace to cross-chain unicorn
– Fought for survival for 2 years: led all GTM for pivotal moments including optional NFT royalties crisis, antagonistic competitive threats on all chains, and cross-chain expansion among chain maxi users
– Penetrated sound barrier with onchain users via strong narrative and virality; growth hacked X to 200K myself via creators & counter-positioning vs OpenSea, grew Discord to 100K+ via whitelists and community
– Supported team's aspirations to create famous Magic Eden Yacht Party series, covered by Forbes and on X
Digital UX Director 11/20 – 11/21
Marriott International
– Improved the mobile and web app to have more flexible modules for localized content
APAC Marketing Director (entire non-luxury portfolio) 5/19 – 10/20
Marriott International
– Drove 1.4B views for Courtyard via 1st China reality TV partnership with Gen Z show 'Hot Offer'`

// JobRow.tsx badge thresholds (must mirror src/components/JobRow.tsx).
function badge(score: number): 'Strong' | 'Good' | 'Partial' | 'Weak' {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Partial'
  return 'Weak'
}

// Isolate the family / non-GTM discrimination: hold a strong CV-fit score with
// perfect location + salary so the only variable is the role-mismatch penalty.
function score(jobTitle: string): number {
  return compositeScore(85, 100, 100, { jobTitle, cvText: TIFFANY_CV })
}

describe('Tiffany regression — crypto/growth marketer matching', () => {
  it('classifies her CV as the marketing family (was null)', () => {
    expect(classifyCv(TIFFANY_CV)).toBe('marketing')
  })

  // The exact nine titles from the screenshot that were all "Strong".
  it('demotes the irrelevant screenshot roles out of Strong', () => {
    const irrelevant = [
      'Sales Recruiter (GTM)',
      'Enterprise Sales Recruiter, East',
      'Senior Manager, Growth Data Science',
      'Product Data Scientist - Growth',
      'Senior Product Manager, Partnerships',
      'Principal Product Manager, Gusto Product Platform',
      'Director of Strategic Partnerships, Snowflake',
      'Head of Private Equity Partnerships',
    ]
    for (const title of irrelevant) {
      const s = score(title)
      expect(badge(s), `${title} → ${s} (${badge(s)}) should not be Strong`).not.toBe('Strong')
    }
  })

  it('keeps a genuine marketing leadership role as Strong', () => {
    // The one good match in the screenshot.
    expect(badge(score('Head of Social and Influencer Marketing'))).toBe('Strong')
  })

  it('surfaces genuine growth/marketing roles as Strong', () => {
    expect(badge(score('Head of Growth Marketing'))).toBe('Strong')
    expect(badge(score('VP Marketing'))).toBe('Strong')
    expect(badge(score('Director of Brand Marketing'))).toBe('Strong')
    expect(badge(score('Head of Growth'))).toBe('Strong')
  })

  it('classifies the leaked non-GTM titles to null (job side)', () => {
    expect(classifyRole('Senior Manager, Growth Data Science')).toBeNull()
    expect(classifyRole('Product Data Scientist - Growth')).toBeNull()
    expect(classifyRole('Senior Product Manager, Partnerships')).toBeNull()
  })

  it('classifies leadership marketing/partnerships titles correctly', () => {
    expect(classifyRole('Head of Social and Influencer Marketing')).toBe('marketing')
    expect(classifyRole('Director of Strategic Partnerships, Snowflake')).toBe('partnerships')
    expect(classifyRole('Head of Private Equity Partnerships')).toBe('partnerships')
  })
})
