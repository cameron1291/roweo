import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!)
  }
  return _resend
}

export const FROM_EMAIL = 'Roweo <hello@roweo.com.au>'
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'cameron.drayton@hotmail.co.uk'

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}) {
  const resend = getResend()
  return resend.emails.send({
    from: FROM_EMAIL,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
  })
}
