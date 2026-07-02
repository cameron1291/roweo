import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { DashboardNav } from './dashboard-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, onboarding_completed, full_name, role')
    .eq('id', user.id)
    .single()

  // Admins skip onboarding and go straight to admin panel
  if (profile?.role === 'admin') redirect('/admin')

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const isActive = profile?.subscription_status === 'active'
  const isPastDue = profile?.subscription_status === 'past_due'

  // No subscription = no dashboard access. Past-due users keep access while
  // Stripe retries payment (typically up to 7 days).
  if (!isActive && !isPastDue) redirect('/pricing')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside aria-label="Sidebar" className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="h-20 flex items-center px-4 border-b border-gray-200">
          <Logo height={32} />
        </div>

        <DashboardNav />

        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1B2A4A] text-white text-xs flex items-center justify-center font-bold">
              {(profile?.full_name ?? user.email ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-900 font-medium truncate">{profile?.full_name ?? user.email}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-gray-500 hover:text-gray-900 px-2">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {isPastDue && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between">
            <p className="text-sm text-amber-700">
              Your payment failed. Update your card to keep your subscription active.
            </p>
            <Link href="/dashboard/settings/billing">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">Update card</Button>
            </Link>
          </div>
        )}

        <main id="main-content" className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
