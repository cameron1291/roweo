import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { AcquisitionLetterDocument } from '@/lib/pdf/acquisition-letter-document'
import QRCode from 'qrcode'
import React from 'react'
import fs from 'fs'
import path from 'path'

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

  // Never use localhost in QR codes — always use production URL
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const APP_URL = rawUrl.includes('localhost') ? 'https://roweo.com.au' : rawUrl
  const demoUrl = prospect.demo_slug ? `${APP_URL}/demo/${prospect.demo_slug}` : `${APP_URL}/demo`
  const displayUrl = prospect.demo_slug ? `roweo.com.au/demo/${prospect.demo_slug}` : 'roweo.com.au/demo'

  let qrCodeDataUrl: string | undefined
  try {
    qrCodeDataUrl = await QRCode.toDataURL(demoUrl, { width: 200, margin: 1, color: { dark: '#1B2A4A', light: '#FFFFFF' } })
  } catch { /* skip QR if generation fails */ }

  // Logo as base64 so react-pdf can embed it without filesystem access issues
  let logoDataUrl: string | undefined
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBuffer = fs.readFileSync(logoPath)
    logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch { /* skip if missing */ }

  // DA stats — try their specific suburbs first, fall back to Sydney-wide if 0
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let stats = { dasThisMonth: 0, matchingSuburbs: 0, avgResponseRate: '3.8%' }

  if (prospect.service_suburbs?.length > 0) {
    const { count } = await supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .in('suburb', prospect.service_suburbs)
      .gte('lodged_date', thirtyDaysAgo)
    stats.dasThisMonth = count ?? 0
    stats.matchingSuburbs = prospect.service_suburbs.length
  }

  // If suburb match returns 0 (e.g. service_suburbs stores region names not suburb names),
  // fall back to Sydney metro count so we never send a letter showing 0
  if (stats.dasThisMonth === 0) {
    const SYDNEY_SUBURBS = [
      'Parramatta','Blacktown','Liverpool','Penrith','Campbelltown','Hornsby','Ryde',
      'Sutherland','Randwick','Leichhardt','Newtown','Glebe','Balmain','Marrickville',
      'Ashfield','Strathfield','Auburn','Bankstown','Hurstville','Rockdale','Kogarah',
      'Manly','Dee Why','Frenchs Forest','Chatswood','Lane Cove','Mosman','Cremorne',
      'Bondi','Coogee','Maroubra','Cronulla','Miranda','Caringbah','Engadine',
      'Castle Hill','Baulkham Hills','Kellyville','Bella Vista','Norwest',
    ]
    const { count: sydneyCount } = await supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .in('suburb', SYDNEY_SUBURBS)
      .gte('lodged_date', thirtyDaysAgo)
    stats.dasThisMonth = sydneyCount ?? 0
    stats.matchingSuburbs = 40
  }

  const serviceArea = prospect.service_suburbs?.length > 0
    ? (prospect.service_suburbs as string[]).slice(0, 3).join(', ')
    : 'your service area'

  const buffer = await renderToBuffer(
    React.createElement(AcquisitionLetterDocument, {
      props: {
        prospectCompanyName: prospect.company_name,
        prospectAddress: prospect.postal_address,
        prospectSuburb: prospect.service_suburbs?.[0],
        serviceArea,
        letterBodyText: prospect.letter_body_text,
        qrCodeDataUrl,
        logoDataUrl,
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
