'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Setting up your subscription…')
  const attempts = useRef(0)

  useEffect(() => {
    const supabase = createClient()
    const MAX_ATTEMPTS = 15 // 30 seconds

    const poll = async () => {
      attempts.current += 1

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (profile?.subscription_status === 'active') {
        setMessage('All set! Taking you to your dashboard…')
        router.replace('/dashboard')
        return
      }

      if (attempts.current >= MAX_ATTEMPTS) {
        // Webhook is slow — send them anyway, dashboard will show the right state
        router.replace('/dashboard')
        return
      }

      setTimeout(poll, 2000)
    }

    const timer = setTimeout(poll, 1500)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment received</h1>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  )
}
