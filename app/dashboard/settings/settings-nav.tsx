'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard/settings', label: 'Company' },
  { href: '/dashboard/settings/letter', label: 'Letter template' },
  { href: '/dashboard/settings/billing', label: 'Billing' },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 border-b border-gray-200 mb-6">
      {TABS.map(tab => {
        const active = tab.href === '/dashboard/settings'
          ? pathname === '/dashboard/settings'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? 'border-[#1B2A4A] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
