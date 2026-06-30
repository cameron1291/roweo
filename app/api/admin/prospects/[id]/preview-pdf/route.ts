import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { AcquisitionLetterDocument } from '@/lib/pdf/acquisition-letter-document'
import QRCode from 'qrcode'
import React from 'react'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return serviceClient
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: prospect } = await supabase.from('builder_prospects').select('*').eq('id', id).single()
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!prospect.letter_body_text) return NextResponse.json({ error: 'Letter not generated yet' }, { status: 400 })

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const demoUrl = prospect.demo_slug ? `${APP_URL}/demo/${prospect.demo_slug}` : `${APP_URL}/demo`
  const displayUrl = prospect.demo_slug ? `roweo.com.au/demo/${prospect.demo_slug}` : 'roweo.com.au/demo'

  let qrCodeDataUrl: string | undefined
  try {
    qrCodeDataUrl = await QRCode.toDataURL(demoUrl, { width: 200, margin: 1, color: { dark: '#1B2A4A', light: '#FFFFFF' } })
  } catch { /* skip QR if generation fails */ }

  // DA stats for their suburbs
  let stats = { dasThisMonth: 0, matchingSuburbs: 0, avgResponseRate: '3.8%' }
  if (prospect.service_suburbs?.length > 0) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { count } = await supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .in('suburb', prospect.service_suburbs)
      .gte('lodged_date', thirtyDaysAgo)
    stats.dasThisMonth = count ?? 0
    stats.matchingSuburbs = prospect.service_suburbs.length
  }

  const buffer = await renderToBuffer(
    React.createElement(AcquisitionLetterDocument, {
      props: {
        prospectCompanyName: prospect.company_name,
        prospectAddress: prospect.postal_address,
        prospectSuburb: prospect.service_suburbs?.[0],
        letterBodyText: prospect.letter_body_text,
        qrCodeDataUrl,
        demoUrl: displayUrl,
        stats,
      },
    }) as React.ReactElement<DocumentProps>
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="roweo-acquisition-${prospect.company_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf"`,
    },
  })
}
