'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Mail, FileText, Settings, MapPin, BellRing } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/leads', label: 'Leads', icon: MapPin, exact: false },
  { href: '/dashboard/letters', label: 'Letters', icon: Mail, exact: false },
  { href: '/dashboard/notifications', label: 'Notifications', icon: BellRing, exact: false },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, exact: false },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Dashboard navigation" className="flex-1 py-4 px-2 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
              isActive
                ? 'bg-[#1B2A4A] text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
