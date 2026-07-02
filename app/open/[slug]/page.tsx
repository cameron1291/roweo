import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EnvelopeReveal } from './envelope-reveal'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data } = await supabase.from('builder_prospects').select('company_name').eq('demo_slug', slug).single()
  return {
    title: `A letter for ${data?.company_name ?? 'you'} — Roweo`,
    robots: 'noindex',
  }
}

export default async function OpenSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: prospect } = await supabase
    .from('builder_prospects')
    .select('id, company_name, service_suburbs, demo_slug')
    .eq('demo_slug', slug)
    .single()

  if (!prospect) notFound()

  const suburb = (prospect.service_suburbs as string[])?.[0] ?? 'your area'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const demoUrl = `${appUrl}/demo/${slug}`

  return (
    <EnvelopeReveal
      slug={slug}
      companyName={prospect.company_name as string}
      suburb={suburb}
      demoUrl={demoUrl}
    />
  )
}
