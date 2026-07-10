import { Skeleton } from '@/components/ui/skeleton'

export default function NotificationsLoading() {
  return (
    <div>
      <Skeleton className="h-6 w-28 mb-1" />
      <Skeleton className="h-4 w-64 mb-6" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-4 flex gap-4">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full max-w-xs" />
            </div>
            <Skeleton className="h-3 w-12 shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
