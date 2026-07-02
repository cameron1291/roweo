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
  { href: '/admin/feature-flags', label: 'Feature Flags' },
  { href: '/admin/audit-log', label: 'Audit Log' },
  { href: '/admin/churn', label: 'Churn Feedback' },
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
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col py-6 px-4">
        <div className="mb-8 px-2">
          <Logo height={32} />
          <span className="text-xs text-gray-400 mt-2 block font-medium">Admin panel</span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm transition-colors",
                "text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium"
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Builder dashboard
        </Link>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
