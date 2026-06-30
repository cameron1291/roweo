import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Anti-Spam Policy — Roweo',
  description: 'Roweo\'s compliance with the Australian Spam Act 2003 and responsible outreach practices.',
}

export default function SpamPage() {
  return (
    <article className="prose prose-invert prose-zinc max-w-none">
      <h1>Anti-Spam Policy</h1>
      <p className="text-gray-500">Last updated: 1 July 2026</p>

      <h2>1. Our commitment</h2>
      <p>Roweo complies with the <strong>Australian Spam Act 2003 (Cth)</strong> and the <strong>Do Not Call Register Act 2006 (Cth)</strong>. We take anti-spam obligations seriously and expect all users of our platform to do the same.</p>

      <h2>2. Physical letters to homeowners</h2>
      <p>Physical letters sent on behalf of builders via Roweo:</p>
      <ul>
        <li>Identify the sending builder's full company name, ABN/licence number, phone, and address</li>
        <li>Do not imply council or government affiliation</li>
        <li>Include an opt-out instruction ("If you do not wish to receive further correspondence from [builder name], please contact them at [phone/email]")</li>
        <li>Are sent to addresses only where a development application has been publicly lodged — signalling the homeowner's intent to build</li>
      </ul>
      <p>Physical mail in Australia does not require formal prior consent under the Spam Act, which applies to commercial <em>electronic</em> messages only. However, we require all letters to comply with Australian Consumer Law and general fair dealing principles.</p>

      <h2>3. Commercial emails to builder prospects</h2>
      <p>When Roweo sends commercial electronic messages (emails) to builder prospects for our own sales outreach:</p>
      <ul>
        <li><strong>Consent</strong>: We email only business email addresses that are publicly listed on the business's own website or directory listing. This constitutes inferred consent under the Spam Act for business-to-business messages.</li>
        <li><strong>Identification</strong>: Every email identifies Roweo, our ABN, and our Sydney NSW postal address.</li>
        <li><strong>Unsubscribe</strong>: Every email contains a working unsubscribe link. We honour unsubscribe requests immediately (within minutes, not 5 days).</li>
        <li><strong>No personal email addresses</strong>: We do not send commercial emails to personal Gmail, Hotmail, or similar addresses obtained from any source.</li>
      </ul>

      <h2>4. Unsubscribe</h2>
      <p>To unsubscribe from Roweo's sales outreach emails, click the unsubscribe link in any email we have sent you. Your address will be immediately removed from our outreach list. If you have difficulty unsubscribing, email <a href="mailto:hello@roweo.com.au">hello@roweo.com.au</a> and we will remove you within 24 hours.</p>

      <h2>5. Reporting spam</h2>
      <p>If you receive a letter or email that you believe violates this policy or the Spam Act, please contact us at <a href="mailto:hello@roweo.com.au">hello@roweo.com.au</a>. You can also report spam to the <a href="https://www.acma.gov.au/report-spam" target="_blank" rel="noopener noreferrer">ACMA (Australian Communications and Media Authority)</a>.</p>

      <h2>6. Builder responsibilities</h2>
      <p>Builders using Roweo to send letters are responsible for ensuring their letter content does not violate Australian Consumer Law, the Spam Act (for any electronic follow-up), or any other applicable legislation. Roweo's letter template includes a required compliance disclaimer and opt-out instruction. Builders must not remove these.</p>

      <h2>7. Contact</h2>
      <p><a href="mailto:hello@roweo.com.au">hello@roweo.com.au</a> — Roweo, Sydney NSW, Australia.</p>

      <hr />
      <p className="text-sm text-gray-400">See also: <Link href="/legal/privacy">Privacy Policy</Link> · <Link href="/legal/terms">Terms of Service</Link></p>
    </article>
  )
}
