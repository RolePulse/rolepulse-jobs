import type { Metadata } from 'next'
import Link from 'next/link'
import { HomeFooter } from '@/components/HomeFooter'

export const metadata: Metadata = {
  title: 'Privacy Policy | RolePulse',
  description: 'How RolePulse collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-rp-text-1 mb-2">Privacy Policy</h1>
        <p className="text-sm text-rp-text-2 mb-12">Last updated: 16 April 2026</p>

        <div className="prose prose-zinc max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-rp-text-1 [&_h2]:mt-10 [&_h2]:mb-4 [&_p]:text-rp-text-2 [&_p]:leading-relaxed [&_li]:text-rp-text-2 [&_li]:leading-relaxed [&_ul]:mt-2 [&_ul]:mb-4">
          <h2>1. Who we are</h2>
          <p>
            RolePulse ("we", "us", "our") operates rolepulse.com and related services including CV Pulse (cvpulse.io).
            We are a UK-based company. For questions about this policy, contact us at james@rolepulse.com.
          </p>

          <h2>2. What data we collect</h2>
          <p>We collect the following categories of personal data:</p>
          <ul className="list-disc pl-6">
            <li><strong>Account data</strong> — email address, name, and authentication credentials when you create an account.</li>
            <li><strong>CV and profile data</strong> — CV content, work history, skills, and preferences you upload or enter.</li>
            <li><strong>Job activity data</strong> — jobs you view, save, or apply to, and your application pipeline activity.</li>
            <li><strong>Usage data</strong> — pages visited, device information, IP address, and browser type, collected automatically.</li>
            <li><strong>Employer data</strong> — company details and job listing content submitted by employers.</li>
          </ul>

          <h2>3. How we use your data</h2>
          <p>We use your data to:</p>
          <ul className="list-disc pl-6">
            <li>Provide and improve our job board, CV scoring, and application tracking services.</li>
            <li>Match you with relevant roles based on your profile and preferences.</li>
            <li>Send job alerts you have opted into.</li>
            <li>Process employer job postings and payments.</li>
            <li>Analyse aggregate usage to improve the platform.</li>
            <li>Comply with legal obligations.</li>
          </ul>

          <h2>4. Legal basis for processing</h2>
          <p>We process your data under the following legal bases (UK GDPR):</p>
          <ul className="list-disc pl-6">
            <li><strong>Contract</strong> — to provide the services you have signed up for.</li>
            <li><strong>Legitimate interest</strong> — to improve our services and prevent fraud.</li>
            <li><strong>Consent</strong> — for optional communications such as newsletters.</li>
          </ul>

          <h2>5. Data sharing</h2>
          <p>We do not sell your personal data. We share data only with:</p>
          <ul className="list-disc pl-6">
            <li><strong>Service providers</strong> — hosting (Vercel), database (Supabase), payments (Stripe), and email (Resend) providers who process data on our behalf.</li>
            <li><strong>Employers</strong> — when you apply to a job, the employer receives the information you include in your application.</li>
            <li><strong>Legal requirements</strong> — where required by law or to protect our rights.</li>
          </ul>

          <h2>6. Data retention</h2>
          <p>
            We retain your account and profile data for as long as your account is active. CV data submitted for scoring
            is retained for up to 12 months to support your score history. You can request deletion of your data at
            any time by contacting james@rolepulse.com.
          </p>

          <h2>7. Your rights</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul className="list-disc pl-6">
            <li>Access the personal data we hold about you.</li>
            <li>Rectify inaccurate data.</li>
            <li>Request deletion of your data.</li>
            <li>Object to or restrict processing.</li>
            <li>Data portability — receive your data in a structured format.</li>
            <li>Withdraw consent at any time for consent-based processing.</li>
          </ul>
          <p>To exercise any of these rights, email james@rolepulse.com.</p>

          <h2>8. Cookies and analytics</h2>
          <p>
            We use essential cookies for authentication and session management. We use PostHog for product analytics.
            You can control cookie preferences in your browser settings.
          </p>

          <h2>9. International transfers</h2>
          <p>
            Your data may be processed in the United States by our service providers (Vercel, Supabase, Stripe).
            These transfers are protected by appropriate safeguards including standard contractual clauses.
          </p>

          <h2>10. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be communicated via the platform.
            Continued use of our services after changes constitutes acceptance.
          </p>

          <h2>11. Contact</h2>
          <p>
            For privacy-related enquiries, contact james@rolepulse.com.
          </p>
        </div>
      </div>
      <HomeFooter />
    </main>
  )
}
