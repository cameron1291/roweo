'use client'

import { useEffect, useRef } from 'react'

interface Props {
  slug: string
  appUrl: string
}

export function DemoEngagementTracker({ slug, appUrl }: Props) {
  const sentScrollRef = useRef<Set<number>>(new Set())
  const startTimeRef = useRef(Date.now())

  function track(event: string, metadata?: Record<string, unknown>) {
    navigator.sendBeacon
      ? navigator.sendBeacon(`${appUrl}/api/demo/event`, JSON.stringify({ slug, event, metadata }))
      : fetch(`${appUrl}/api/demo/event`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, event, metadata }), keepalive: true })
  }

  useEffect(() => {
    // Page view
    track('page_viewed')

    // Scroll depth
    function onScroll() {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.body.scrollHeight
      const pct = Math.round((scrolled / total) * 100)
      for (const threshold of [25, 50, 75, 100]) {
        if (pct >= threshold && !sentScrollRef.current.has(threshold)) {
          sentScrollRef.current.add(threshold)
          track('scroll_depth', { pct: threshold })
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Time on page (on unload)
    function onUnload() {
      const seconds = Math.round((Date.now() - startTimeRef.current) / 1000)
      track('time_on_page', { seconds })
    }
    window.addEventListener('beforeunload', onUnload)

    // CTA click tracking
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const cta = target.closest('[data-cta]')?.getAttribute('data-cta')
      if (cta) track('cta_clicked', { cta })
    }
    document.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('beforeunload', onUnload)
      document.removeEventListener('click', onClick)
    }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
