import { Logo } from '@/components/logo'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
        <Logo height={28} />
      </header>
      <main className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        {children}
      </main>
    </div>
  )
}
