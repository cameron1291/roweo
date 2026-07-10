import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Skeleton className="h-6 w-20 mb-1" />
        <Skeleton className="h-4 w-60 mb-6" />
      </div>

      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}

      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  )
}
