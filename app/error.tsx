'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
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
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
          <div className="text-center max-w-md">
            <p className="text-5xl font-bold text-[#1B2A4A] mb-4">Oops</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              An unexpected error occurred. Try refreshing the page — if it keeps happening, contact support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Back to home
              </Link>
            </div>
            {error.digest && (
              <p className="text-xs text-gray-400 mt-6">Error ID: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
