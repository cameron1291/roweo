'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-sm">
        <p className="text-4xl font-bold text-[#1B2A4A] mb-3">!</p>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6">
          This page ran into an error. Your data is safe — try refreshing.
        </p>
        <button
          onClick={reset}
          className="bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Refresh
        </button>
        {error.digest && (
          <p className="text-xs text-gray-400 mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
