import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Roweo',
  description: 'Terms governing your use of the Roweo builder leads platform.',
}

export default function TermsPage() {
  return (
    <article className="prose prose-invert prose-zinc max-w-none">
      <h1>Terms of Service</h1>
      <p className="text-zinc-400">Last updated: 1 July 2026</p>

      <h2>1. Acceptance</h2>
      <p>By creating a Roweo account you agree to these Terms. If you do not agree, do not use the service.</p>

      <h2>2. Service description</h2>
      <p>Roweo matches subscribing builders to publicly available development applications (DAs) in their service area and, with the builder's approval, prints and posts physical letters to the corresponding property addresses on the builder's behalf.</p>

      <h2>3. Subscription and billing</h2>
      <ul>
        <li>Subscriptions are billed monthly at AUD $299 + GST.</li>
        <li>Payment is processed by Stripe. You authorise Stripe to charge your card each billing cycle.</li>
        <li>Subscriptions are month-to-month with no lock-in contract.</li>
        <li>Cancellation takes effect at the end of the current paid period. No refunds are issued for the current period.</li>
        <li>If a payment fails, Stripe retries automatically. Access is suspended only after all retries are exhausted (typically 7 days).</li>
      </ul>

      <h2>4. Letter delivery</h2>
      <ul>
        <li>We commit to printing and posting approved letters within 2 business days of approval.</li>
        <li>We do not guarantee homeowner response, quote requests, or project wins. Letters are an outreach tool, not a guaranteed lead generation system.</li>
        <li>Australia Post delivery times are outside our control.</li>
      </ul>

      <h2>5. DA data accuracy</h2>
      <p>DA data is sourced from NSW and ACT government planning registers. While we classify and process this data with care, we do not guarantee its accuracy, completeness, or currency. You are responsible for verifying DA details before contacting homeowners. Roweo is not liable for inaccuracies in source data.</p>

      <h2>6. Letter content</h2>
      <ul>
        <li>You are responsible for the accuracy of all information in your letter template, including your company name, licence number, and contact details.</li>
        <li>Letters must not make false or misleading representations in violation of the Australian Consumer Law.</li>
        <li>Letters must not imply council or government endorsement.</li>
        <li>The compliance disclaimer ("This letter was sent independently by the builder named above and is not affiliated with any local council or government authority") must remain in all letters. You may not remove it.</li>
        <li>Roweo reserves the right to suspend your account if letter content is found to be misleading, harassing, or in breach of any law.</li>
      </ul>

      <h2>7. QR tracking data</h2>
      <p>Scan events and homeowner quote requests submitted via your letter's QR landing page belong to your account. Roweo stores this data and may use aggregate, anonymised insights to improve the service.</p>

      <h2>8. Prohibited uses</h2>
      <p>You must not use Roweo to:</p>
      <ul>
        <li>Contact homeowners for purposes unrelated to genuine building services</li>
        <li>Send letters on behalf of a business that does not hold a valid builder's licence</li>
        <li>Resell or redistribute DA data extracted from the platform</li>
        <li>Circumvent rate limits or access the platform by automated means not provided by Roweo</li>
      </ul>

      <h2>9. Intellectual property</h2>
      <p>The Roweo platform, software, brand, and letter templates are owned by Roweo. Your company logo and brand assets remain yours. DA data is sourced from government open data under Creative Commons licences.</p>

      <h2>10. Limitation of liability</h2>
      <p>To the maximum extent permitted by Australian law, Roweo's liability for any claim arising from this service is limited to the fees paid by you in the 30 days preceding the claim. Roweo is not liable for indirect, consequential, or economic losses.</p>

      <h2>11. Governing law</h2>
      <p>These Terms are governed by the laws of New South Wales, Australia. Disputes will be resolved in NSW courts.</p>

      <h2>12. Changes</h2>
      <p>We may update these Terms. Material changes will be notified by email at least 14 days before taking effect. Continued use after that date constitutes acceptance.</p>

      <h2>13. Contact</h2>
      <p><a href="mailto:hello@roweo.com.au">hello@roweo.com.au</a> — Roweo, Sydney NSW, Australia.</p>
    </article>
  )
}
