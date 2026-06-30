import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Founder Dashboard' },
  { href: '/admin/print-queue', label: 'Print Queue' },
  { href: '/admin/das', label: 'DAs' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/scraper', label: 'Scraper Log' },
  { href: '/admin/prospects', label: 'Prospects' },
  { href: '/admin/campaigns', label: 'Campaigns' },
  { href: '/admin/analytics', label: 'Analytics' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <aside className="w-56 flex-shrink-0 border-r border-white/5 flex flex-col py-6 px-4">
        <div className="mb-8 px-2">
          <Logo height={22} />
          <span className="text-xs text-zinc-500 mt-1 block">Admin</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm transition-colors",
                "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Back to dashboard
        </Link>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
