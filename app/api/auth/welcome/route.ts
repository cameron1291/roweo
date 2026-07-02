import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/emails'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false })

  try {
    await sendWelcomeEmail(parsed.data.email, parsed.data.name)
  } catch {
    // Non-critical — never fail signup because of email
  }
  return NextResponse.json({ ok: true })
}
