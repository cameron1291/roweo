import { Skeleton } from '@/components/ui/skeleton'

export default function LettersLoading() {
  return (
    <div>
      <Skeleton className="h-6 w-16 mb-1" />
      <Skeleton className="h-4 w-80 mb-6" />

      <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
