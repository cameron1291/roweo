import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-[#1B2A4A] mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page not found</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          That page doesn&apos;t exist or has moved. Head back to the dashboard or homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
