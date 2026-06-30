import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LayoutDashboard, Mail, FileText, Settings, Bell, LogOut, ExternalLink } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Leads', icon: Bell },
  { href: '/dashboard/letters', label: 'Letters', icon: Mail },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, onboarding_completed, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const isActive = profile?.subscription_status === 'active'
  const isPastDue = profile?.subscription_status === 'past_due'

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/10 flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-white/10">
          <Logo height={26} />
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-medium">
              {(profile?.full_name ?? user.email ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{profile?.full_name ?? user.email}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-zinc-500 hover:text-white px-2">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Subscription banners */}
        {isPastDue && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between">
            <p className="text-sm text-amber-400">
              Your payment failed. Update your card to keep your subscription active.
            </p>
            <Link href="/dashboard/settings/billing">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black text-xs">Update card</Button>
            </Link>
          </div>
        )}
        {!isActive && !isPastDue && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-2.5 flex items-center justify-between">
            <p className="text-sm text-blue-400">
              Subscribe to start receiving DA leads and sending letters.
            </p>
            <Link href="/dashboard/settings/billing">
              <Button size="sm" className="text-xs">Subscribe — $299/mo AUD</Button>
            </Link>
          </div>
        )}

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
