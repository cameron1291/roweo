import { Logo } from '@/components/logo'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="flex items-center h-14 px-6 border-b border-white/10">
        <Logo height={28} />
      </header>
      <main className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        {children}
      </main>
    </div>
  )
}
