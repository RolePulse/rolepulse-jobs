import type { Metadata } from 'next'
import Link from 'next/link'
import { HomeFooter } from '@/components/HomeFooter'

export const metadata: Metadata = {
  title: 'Terms of Service | RolePulse',
  description: 'Terms and conditions for using RolePulse and related services.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-rp-text-1 mb-2">Terms of Service</h1>
        <p className="text-sm text-rp-text-2 mb-12">Last updated: 16 April 2026</p>

        <div className="prose prose-zinc max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-rp-text-1 [&_h2]:mt-10 [&_h2]:mb-4 [&_p]:text-rp-text-2 [&_p]:leading-relaxed [&_li]:text-rp-text-2 [&_li]:leading-relaxed [&_ul]:mt-2 [&_ul]:mb-4">
          <h2>1. Agreement</h2>
          <p>
            By accessing or using RolePulse (rolepulse.com) and related services including CV Pulse (cvpulse.io),
            you agree to these Terms of Service. If you do not agree, do not use the services.
          </p>

          <h2>2. Services</h2>
          <p>RolePulse provides:</p>
          <ul className="list-disc pl-6">
            <li><strong>Job board</strong> — curated GTM (go-to-market) roles aggregated from company career pages and ATS platforms.</li>
            <li><strong>CV scoring</strong> — AI-powered analysis of CVs against target roles, providing scores and actionable feedback.</li>
            <li><strong>Application tracking</strong> — tools to track and manage your job applications through the hiring process.</li>
            <li><strong>Employer services</strong> — paid job posting and candidate access for employers.</li>
          </ul>

          <h2>3. Accounts</h2>
          <p>
            You may need to create an account to use certain features. You are responsible for maintaining the
            security of your account credentials and for all activity under your account. You must provide accurate
            information and keep it up to date.
          </p>

          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6">
            <li>Use the platform for any unlawful purpose.</li>
            <li>Submit false or misleading information in CVs, profiles, or job listings.</li>
            <li>Scrape, crawl, or use automated tools to access the platform without our consent.</li>
            <li>Attempt to gain unauthorised access to our systems or other users' accounts.</li>
            <li>Post discriminatory, abusive, or fraudulent job listings.</li>
            <li>Use CV data obtained through the platform for purposes other than recruitment.</li>
          </ul>

          <h2>5. CV data and scoring</h2>
          <p>
            When you upload a CV for scoring, you grant us a licence to process and analyse the document to provide
            our scoring service. We do not share your CV with employers unless you explicitly apply to a role.
            CV scoring results are indicative and should not be treated as a guarantee of employment outcomes.
          </p>

          <h2>6. Job listings</h2>
          <p>
            Job listings are sourced from third-party ATS platforms (Greenhouse, Ashby, Lever) and employer submissions.
            We make reasonable efforts to ensure accuracy but do not guarantee that all listings are current, accurate,
            or complete. Apply directly with employers to confirm details.
          </p>

          <h2>7. Employer terms</h2>
          <p>
            Employers who post jobs agree to provide accurate listing information and comply with all applicable
            employment and anti-discrimination laws. Paid listings are non-refundable once published. We reserve
            the right to remove listings that violate these terms.
          </p>

          <h2>8. Payments</h2>
          <p>
            Payments for employer services are processed by Stripe. By making a payment, you agree to
            Stripe's terms of service. All fees are in GBP unless stated otherwise and are exclusive of VAT
            where applicable.
          </p>

          <h2>9. Intellectual property</h2>
          <p>
            All platform content, design, and code are owned by RolePulse or its licensors. Job listing content
            is owned by the respective employers. You retain ownership of any CV or profile content you submit.
          </p>

          <h2>10. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, RolePulse is not liable for any indirect, incidental, or
            consequential damages arising from your use of the platform. Our total liability for any claim
            shall not exceed the amount you have paid to us in the 12 months preceding the claim.
          </p>

          <h2>11. Disclaimer</h2>
          <p>
            The platform is provided "as is" without warranties of any kind. We do not guarantee that the
            platform will be uninterrupted, error-free, or that job applications will result in employment.
          </p>

          <h2>12. Termination</h2>
          <p>
            We may suspend or terminate your account at any time for violation of these terms. You may delete
            your account at any time by contacting james@rolepulse.com.
          </p>

          <h2>13. Governing law</h2>
          <p>
            These terms are governed by the laws of England and Wales. Any disputes shall be subject to the
            exclusive jurisdiction of the courts of England and Wales.
          </p>

          <h2>14. Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the platform after changes
            constitutes acceptance of the updated terms.
          </p>

          <h2>15. Contact</h2>
          <p>
            For questions about these terms, contact james@rolepulse.com.
          </p>
        </div>
      </div>
      <HomeFooter />
    </main>
  )
}
