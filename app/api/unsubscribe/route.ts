import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const prospectId = searchParams.get('id')

  if (!prospectId) {
    return new NextResponse('<p>Invalid unsubscribe link.</p>', { headers: { 'content-type': 'text/html' } })
  }

  const supabase = createServiceClient()
  await supabase.from('builder_prospects').update({
    email_unsubscribed: true,
    email_unsubscribed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', prospectId)

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><title>Unsubscribed — Roweo</title>
    <style>body{font-family:sans-serif;max-width:480px;margin:60px auto;padding:24px;color:#374151;text-align:center}h1{font-size:20px}p{color:#6B7280;font-size:14px}a{color:#3B6FDB}</style>
    </head>
    <body>
      <h1>You've been unsubscribed</h1>
      <p>We've removed you from our outreach list. You won't receive any further emails from Roweo.</p>
      <p>If this was a mistake, email us at <a href="mailto:hello@roweo.com.au">hello@roweo.com.au</a>.</p>
    </body>
    </html>
  `

  return new NextResponse(html, { headers: { 'content-type': 'text/html' } })
}
