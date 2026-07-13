import { sendEmail, FROM_EMAIL } from '@/lib/resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
const FOOTER = `
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #27272a;color:#52525b;font-size:12px">
    <p>Roweo · Sydney NSW, Australia · <a href="${APP_URL}/legal/privacy" style="color:#52525b">Privacy</a> · <a href="${APP_URL}/legal/spam" style="color:#52525b">Unsubscribe</a></p>
  </div>
`

function wrap(body: string) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#e4e4e7;background:#09090b;border-radius:8px">${body}${FOOTER}</div>`
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#3B6FDB;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:500;font-size:14px">${text}</a>`
}

// ── Builder lifecycle emails ──────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name?: string) {
  return sendEmail({
    to,
    subject: 'Welcome to Roweo — let\'s set you up',
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">Welcome to Roweo${name ? `, ${name}` : ''}!</h2>
      <p>You're a few minutes away from receiving your first DA lead. Here's what to do next:</p>
      <ol style="color:#a1a1aa;padding-left:20px">
        <li style="margin-bottom:8px">Enter your service suburbs and project types</li>
        <li style="margin-bottom:8px">Upload your logo and set your brand colour</li>
        <li style="margin-bottom:8px">Preview and approve your letter template</li>
      </ol>
      <p>Once you've approved your letter, we'll start matching you to DAs automatically.</p>
      <p>${btn('Complete your setup', `${APP_URL}/onboarding`)}</p>
    `),
  })
}

export async function sendOnboardingReminderEmail(to: string) {
  return sendEmail({
    to,
    subject: 'Your Roweo setup isn\'t finished yet',
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">You're almost there</h2>
      <p>You started setting up your Roweo account but didn't finish. It only takes 5 more minutes.</p>
      <p>Once you approve your letter template, we'll match you to every development application that comes in for your service area — automatically.</p>
      <p>${btn('Finish setup', `${APP_URL}/onboarding`)}</p>
      <p style="color:#52525b;font-size:13px">Questions? Reply to this email and we'll help.</p>
    `),
  })
}

export async function sendOnboardingCompleteEmail(to: string) {
  return sendEmail({
    to,
    subject: 'You\'re all set — we\'ll match you to leads as they come in',
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">Setup complete!</h2>
      <p>Your letter template is approved and your service area is saved. Here's what happens next:</p>
      <ul style="color:#a1a1aa;padding-left:20px">
        <li style="margin-bottom:8px">We check the NSW Planning Portal every 6 hours for new DAs</li>
        <li style="margin-bottom:8px">When a match comes in, it appears on your dashboard</li>
        <li style="margin-bottom:8px">We'll send you an email alert — don't worry, we batch them to avoid noise</li>
        <li style="margin-bottom:8px">Your letter goes to the property within 2 business days of each match</li>
      </ul>
      <p>${btn('View your dashboard', `${APP_URL}/dashboard`)}</p>
    `),
  })
}

export async function sendFirstLeadEmail(to: string, suburb: string, projectType: string) {
  const type = projectType.replace(/_/g, ' ')
  return sendEmail({
    to,
    subject: `Your first DA lead is in — ${suburb}`,
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">Your first lead just came in!</h2>
      <p>A homeowner in <strong>${suburb}</strong> has lodged a development application for a <strong>${type}</strong> project — and it matches your service area.</p>
      <p>We're preparing the letter now. It'll be posted to the property within 2 business days.</p>
      <p>${btn('View your leads', `${APP_URL}/dashboard/leads`)}</p>
    `),
  })
}

export async function sendScanNotificationEmail(to: string, suburb: string, companyName: string) {
  return sendEmail({
    to,
    subject: `A homeowner just scanned your letter in ${suburb}!`,
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">Someone scanned your QR code</h2>
      <p>A homeowner in <strong>${suburb}</strong> scanned the QR code on your letter and viewed your <strong>${companyName}</strong> profile.</p>
      <p>They may submit a quote request — if they do, you'll get another email straight away.</p>
      <p>${btn('View your letters', `${APP_URL}/dashboard/letters`)}</p>
    `),
  })
}

export async function sendQuoteRequestEmail(to: string, from: { name: string; phone: string; email?: string; message?: string }, suburb: string) {
  return sendEmail({
    to,
    subject: `New quote request from ${from.name} in ${suburb}`,
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">New quote request!</h2>
      <p><strong>${from.name}</strong> from ${suburb} just submitted a quote request via your letter:</p>
      <div style="background:#18181b;border-radius:6px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px"><strong>Phone:</strong> ${from.phone}</p>
        ${from.email ? `<p style="margin:0 0 8px"><strong>Email:</strong> ${from.email}</p>` : ''}
        ${from.message ? `<p style="margin:0"><strong>Message:</strong> ${from.message}</p>` : ''}
      </div>
      <p>${btn('View in dashboard', `${APP_URL}/dashboard/letters`)}</p>
    `),
  })
}

export async function sendPaymentFailedEmail(to: string) {
  return sendEmail({
    to,
    subject: 'Action required: your Roweo payment failed',
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">Payment failed</h2>
      <p>We couldn't process your Roweo subscription payment. Your account is in a grace period — you still have access while we retry.</p>
      <p>Please update your payment method to avoid any interruption to your leads.</p>
      <p>${btn('Update payment method', `${APP_URL}/dashboard/settings/billing`)}</p>
      <p style="color:#52525b;font-size:13px">If you need help, reply to this email.</p>
    `),
  })
}

export async function sendGracePeriodWarningEmail(to: string, accessUntil: string) {
  return sendEmail({
    to,
    subject: 'Your Roweo account will pause in 3 days',
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">Account pausing soon</h2>
      <p>We've been unable to process your payment. Your access ends on <strong>${accessUntil}</strong> unless payment is updated.</p>
      <p>${btn('Update payment method', `${APP_URL}/dashboard/settings/billing`)}</p>
    `),
  })
}

export async function sendAccountSuspendedEmail(to: string) {
  return sendEmail({
    to,
    subject: 'Your Roweo account has been paused',
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">Account paused</h2>
      <p>Your Roweo subscription has ended. We've stopped matching you to new DAs and posting letters.</p>
      <p>Ready to come back? Resubscribe any time — your service area settings and letter template are still saved.</p>
      <p>${btn('Reactivate your account', `${APP_URL}/pricing`)}</p>
    `),
  })
}

export async function sendAccountReactivatedEmail(to: string) {
  return sendEmail({
    to,
    subject: 'Welcome back — you\'re all set!',
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">Welcome back to Roweo</h2>
      <p>Your subscription is active again. We'll start matching you to new DAs immediately.</p>
      <p>${btn('View your dashboard', `${APP_URL}/dashboard`)}</p>
    `),
  })
}

export async function send7DayCheckinEmail(to: string, stats: { letters: number; scans: number; newLeads: number }) {
  return sendEmail({
    to,
    subject: 'One week with Roweo — here\'s your progress',
    html: wrap(`
      <h2 style="color:#fff;margin-top:0">One week in</h2>
      <p>Here's what's happened in your first week:</p>
      <div style="background:#18181b;border-radius:6px;padding:16px;margin:16px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
        <div><p style="font-size:24px;font-weight:600;margin:0;color:#fff">${stats.letters}</p><p style="margin:4px 0 0;color:#71717a;font-size:13px">Letters sent</p></div>
        <div><p style="font-size:24px;font-weight:600;margin:0;color:#fff">${stats.scans}</p><p style="margin:4px 0 0;color:#71717a;font-size:13px">QR scans</p></div>
        <div><p style="font-size:24px;font-weight:600;margin:0;color:#fff">${stats.newLeads}</p><p style="margin:4px 0 0;color:#71717a;font-size:13px">New leads</p></div>
      </div>
      <p>${btn('View full dashboard', `${APP_URL}/dashboard`)}</p>
      <p style="color:#52525b;font-size:13px">Have feedback on your first week? Reply to this email — we read every response.</p>
    `),
  })
}
