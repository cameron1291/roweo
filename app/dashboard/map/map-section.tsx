'use client'

import { useEffect, useState } from 'react'
import { DaMap } from './da-map'
import type { MatchedDa, NearbyDa } from './da-map'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  builderLat: number
  builderLng: number
  radiusKm: number
  plan: 'starter' | 'professional' | 'growth'
  matchedDas: MatchedDa[]
}

export function MapSection({ builderLat, builderLng, radiusKm, plan, matchedDas }: Props) {
  const [nearbyDas, setNearbyDas] = useState<NearbyDa[]>([])

  useEffect(() => {
    fetch(`/api/dashboard/nearby-das?lat=${builderLat}&lng=${builderLng}&radius_km=${radiusKm}&limit=20`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setNearbyDas(data) })
      .catch(() => {})
  }, [builderLat, builderLng, radiusKm])

  return (
    <Card className="border-gray-200 overflow-hidden">
      <CardContent className="p-0">
        <DaMap
          builderLat={builderLat}
          builderLng={builderLng}
          radiusKm={radiusKm}
          matchedDas={matchedDas}
          nearbyDas={nearbyDas}
          plan={plan}
          canEditRadius={plan === 'growth'}
        />
      </CardContent>
    </Card>
  )
}
