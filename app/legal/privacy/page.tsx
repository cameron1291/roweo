import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Roweo',
  description: 'How Roweo collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert prose-zinc max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-gray-500">Last updated: 1 July 2026</p>

      <h2>1. About this policy</h2>
      <p>Roweo ("we", "us", "our") is committed to protecting your privacy in accordance with the Australian Privacy Act 1988 (Cth). This policy explains how we handle personal information collected through roweo.com.au and related services.</p>

      <h2>2. What data we collect</h2>
      <h3>Builder account data</h3>
      <ul>
        <li>Name, email address, company name, phone number, website, builder's licence number</li>
        <li>Service area suburb preferences and project type preferences</li>
        <li>Uploaded logo and brand colour selection</li>
        <li>Letter template content (greeting, sign-off)</li>
        <li>Billing information (processed securely by Stripe — we do not store card details)</li>
      </ul>
      <h3>Development application (DA) data</h3>
      <p>We collect publicly available DA data from Australian government planning portals. This includes property addresses, project descriptions, and lodgement dates. We do not display homeowner personal contact details (names, phone numbers, email addresses).</p>
      <h3>QR scan tracking</h3>
      <p>When a homeowner scans a QR code from a Roweo letter, we record the scan event (timestamp, anonymous page-load data). No persistent cookies are set. IP addresses are logged for fraud prevention only and are not linked to homeowner identity.</p>
      <h3>Quote request data</h3>
      <p>When a homeowner submits a quote request via the scan landing page, we collect their name, phone number, optional email address, and optional project description. This information is immediately shared with the subscribing builder and stored in our database.</p>
      <h3>Prospect enrichment data (internal only)</h3>
      <p>For our own sales outreach, we collect publicly visible information from business websites, directories, and government registers. This data is used internally only and is never shared with builder subscribers.</p>
      <h3>Interactive demo engagement</h3>
      <p>When a builder prospect views a personalised demo page (/demo/[slug]), we track engagement events (page view, scroll depth, time on page, CTA clicks) using first-party tracking only. No Google Analytics, Facebook Pixel, or other third-party tracking is used.</p>

      <h2>3. How we use your data</h2>
      <ul>
        <li>Matching you to development applications that fit your service area</li>
        <li>Generating and posting physical letters on your behalf</li>
        <li>Sending you notifications when homeowners scan your letters or submit quote requests</li>
        <li>Processing subscription payments via Stripe</li>
        <li>Sending operational emails (lead alerts, scan notifications, billing)</li>
        <li>Improving the service and fixing bugs</li>
      </ul>

      <h2>4. Data storage</h2>
      <p>All data is stored on Supabase (Amazon Web Services, ap-southeast-2 region — Sydney, Australia). Stripe handles all payment card data and is PCI DSS compliant. Resend handles email delivery.</p>

      <h2>5. Data sharing</h2>
      <p>We do not sell your personal information. We share data only with:</p>
      <ul>
        <li>Stripe (payment processing)</li>
        <li>Resend (email delivery)</li>
        <li>Supabase (cloud database hosting)</li>
      </ul>
      <p>When a homeowner submits a quote request via your letter's QR code, their submitted details (name, phone, email, message) are shared with you as the subscribing builder.</p>

      <h2>6. DA data attribution</h2>
      <p>Development application data sourced from the NSW Planning Portal is provided under the Creative Commons Attribution 4.0 International licence. ACT DA data is provided under the Australian Government Open Access and Licensing Framework (AusGOAL).</p>

      <h2>7. Your rights</h2>
      <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href="mailto:hello@roweo.com.au">hello@roweo.com.au</a>. Account deletion removes your builder profile, letter preferences, and match history within 30 days.</p>

      <h2>8. Cookies</h2>
      <p>We use a single session cookie for authentication. We do not use advertising cookies, analytics cookies, or third-party tracking scripts.</p>

      <h2>9. Contact</h2>
      <p>Privacy Officer: <a href="mailto:hello@roweo.com.au">hello@roweo.com.au</a> — Roweo, Sydney NSW, Australia.</p>
    </article>
  )
}
