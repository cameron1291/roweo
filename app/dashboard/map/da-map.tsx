'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Map, { Marker, Source, Layer, Popup } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, ArrowRight, Briefcase, CircleDot } from 'lucide-react'

export interface MatchedDa {
  id: string
  match_id: string
  lat: number
  lng: number
  suburb: string
  project_type: string
  description: string | null
  status: string
}

export interface NearbyDa {
  id: string
  lat: number
  lng: number
  suburb: string
  project_type: string
}

interface Props {
  builderLat: number
  builderLng: number
  radiusKm: number
  matchedDas: MatchedDa[]
  nearbyDas: NearbyDa[]
  plan: 'starter' | 'professional' | 'growth'
  canEditRadius: boolean
  onRadiusChange?: (km: number) => void
}

const PLAN_NEXT_RADIUS: Record<string, number> = {
  starter: 20,
  professional: 50,
  growth: 50,
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Generate a GeoJSON circle polygon approximation */
function makeCircleGeoJson(lat: number, lng: number, radiusKm: number, steps = 64) {
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dLat = (radiusKm / 111) * Math.cos(angle)
    const dLng = (radiusKm / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle)
    coords.push([lng + dLng, lat + dLat])
  }
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  }
}

/** Compute a bounding box that fits all given points + radius ring */
function getBounds(lat: number, lng: number, radiusKm: number, extras: { lat: number; lng: number }[]) {
  const padKm = radiusKm * 1.4
  const latPad = padKm / 111
  const lngPad = padKm / (111 * Math.cos(lat * Math.PI / 180))
  let minLat = lat - latPad, maxLat = lat + latPad
  let minLng = lng - lngPad, maxLng = lng + lngPad
  for (const p of extras) {
    minLat = Math.min(minLat, p.lat - 0.02)
    maxLat = Math.max(maxLat, p.lat + 0.02)
    minLng = Math.min(minLng, p.lng - 0.02)
    maxLng = Math.max(maxLng, p.lng + 0.02)
  }
  return [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]]
}

function formatProjectType(type: string) {
  return type.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export function DaMap({ builderLat, builderLng, radiusKm, matchedDas, nearbyDas, plan, canEditRadius, onRadiusChange }: Props) {
  const router = useRouter()
  const mapRef = useRef<MapRef>(null)
  const [hoveredMatched, setHoveredMatched] = useState<MatchedDa | null>(null)
  const [hoveredNearby, setHoveredNearby] = useState<NearbyDa | null>(null)
  const [radius, setRadius] = useState(radiusKm)
  const [radiusSaving, setRadiusSaving] = useState(false)

  const allPoints = [...matchedDas, ...nearbyDas]
  const bounds = getBounds(builderLat, builderLng, radius, allPoints)
  const circleGeoJson = makeCircleGeoJson(builderLat, builderLng, radius)

  // Fit bounds whenever radius changes
  useEffect(() => {
    mapRef.current?.fitBounds(bounds, { padding: 50, duration: 600 })
  }, [radius]) // eslint-disable-line

  const handleRadiusSave = useCallback(async (km: number) => {
    setRadiusSaving(true)
    await fetch('/api/builder/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_radius_km: km }),
    })
    setRadiusSaving(false)
    onRadiusChange?.(km)
  }, [onRadiusChange])

  const isStarter = plan === 'starter'

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 420 }}>
      {/* Map — always rendered, blurred for starter */}
      <div className={isStarter ? 'filter blur-sm pointer-events-none select-none' : ''} style={{ height: '100%' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ bounds, fitBoundsOptions: { padding: 50 } }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          interactive={false}
        >
          {/* Radius fill */}
          <Source id="radius" type="geojson" data={circleGeoJson}>
            <Layer
              id="radius-fill"
              type="fill"
              paint={{ 'fill-color': '#3B6FDB', 'fill-opacity': 0.08 }}
            />
            <Layer
              id="radius-outline"
              type="line"
              paint={{ 'line-color': '#3B6FDB', 'line-width': 2, 'line-opacity': 0.6 }}
            />
          </Source>

          {/* Builder business pin */}
          <Marker latitude={builderLat} longitude={builderLng} anchor="center">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shadow-lg">
                <Briefcase className="w-3.5 h-3.5 text-white" />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            </div>
          </Marker>

          {/* Matched DA markers (inside service area) */}
          {matchedDas.map(da => {
            const isSent = ['letter_approved', 'printed', 'posted', 'scanned'].includes(da.status)
            return (
              <Marker
                key={da.id}
                latitude={da.lat}
                longitude={da.lng}
                anchor="center"
                onClick={e => { e.originalEvent.stopPropagation(); setHoveredMatched(da); setHoveredNearby(null) }}
              >
                <div
                  className="relative cursor-pointer"
                  onMouseEnter={() => { setHoveredMatched(da); setHoveredNearby(null) }}
                  onMouseLeave={() => setHoveredMatched(null)}
                >
                  <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg ${isSent ? 'bg-green-400' : 'bg-orange-400'}`} />
                  <div className={`absolute inset-0 rounded-full animate-pulse opacity-40 ${isSent ? 'bg-green-400' : 'bg-orange-400'}`} />
                </div>
              </Marker>
            )
          })}

          {/* Nearby teaser markers (outside service area) */}
          {nearbyDas.map(da => (
            <Marker
              key={da.id}
              latitude={da.lat}
              longitude={da.lng}
              anchor="center"
              onClick={e => { e.originalEvent.stopPropagation(); setHoveredNearby(da); setHoveredMatched(null) }}
            >
              <div
                className="relative cursor-pointer"
                onMouseEnter={() => { setHoveredNearby(da); setHoveredMatched(null) }}
                onMouseLeave={() => setHoveredNearby(null)}
              >
                <div className="w-5 h-5 rounded-full bg-gray-500/60 border-2 border-gray-400/40 backdrop-blur-sm flex items-center justify-center shadow">
                  <Lock className="w-2.5 h-2.5 text-gray-300" />
                </div>
              </div>
            </Marker>
          ))}

          {/* Matched DA popup */}
          {hoveredMatched && (
            <Popup
              latitude={hoveredMatched.lat}
              longitude={hoveredMatched.lng}
              anchor="bottom"
              onClose={() => setHoveredMatched(null)}
              closeButton={false}
              className="!p-0 !bg-transparent !border-0 !shadow-none"
            >
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-48 max-w-60 text-xs">
                <p className="font-medium text-gray-100">{hoveredMatched.suburb}</p>
                <Badge variant="secondary" className="text-xs mt-1">{formatProjectType(hoveredMatched.project_type)}</Badge>
                {hoveredMatched.description && (
                  <p className="text-gray-400 mt-1.5 line-clamp-2">{hoveredMatched.description}</p>
                )}
                <Button
                  size="sm"
                  className="w-full mt-2 h-6 text-xs"
                  onClick={() => router.push('/dashboard/leads')}
                >
                  View lead <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </Popup>
          )}

          {/* Nearby teaser popup */}
          {hoveredNearby && (
            <Popup
              latitude={hoveredNearby.lat}
              longitude={hoveredNearby.lng}
              anchor="bottom"
              onClose={() => setHoveredNearby(null)}
              closeButton={false}
              className="!p-0 !bg-transparent !border-0 !shadow-none"
            >
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-48 max-w-60 text-xs">
                <p className="font-medium text-gray-100">{hoveredNearby.suburb}</p>
                <Badge variant="secondary" className="text-xs mt-1">{formatProjectType(hoveredNearby.project_type)}</Badge>
                <p className="text-gray-400 mt-1.5">Outside your {radius}km service radius</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 h-6 text-xs border-blue-500/40 text-blue-400"
                  onClick={() => router.push('/dashboard/settings/billing')}
                >
                  {plan === 'starter' ? 'Upgrade to Professional' : 'Upgrade to Growth'} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Starter upgrade overlay */}
      {isStarter && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70 backdrop-blur-[2px]">
          <CircleDot className="w-8 h-8 text-blue-400 mb-3" />
          <p className="text-sm font-medium text-gray-100 mb-1">See your local DA activity</p>
          <p className="text-xs text-gray-400 mb-4 text-center max-w-xs">Upgrade to Professional to see DAs near your business plotted on a live map.</p>
          <Button onClick={() => router.push('/dashboard/settings/billing')} size="sm">
            Upgrade from $199/mo <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Legend + radius controls */}
      {!isStarter && (
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
          {/* Legend */}
          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 pointer-events-auto">
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" /> Your business
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-400" /> Matched lead
              </span>
              {nearbyDas.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-500/60 border border-gray-400/40" /> Out of range
                </span>
              )}
            </div>
          </div>

          {/* Radius control */}
          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 pointer-events-auto text-xs">
            {canEditRadius ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-300">Radius: <strong className="text-gray-100">{radius}km</strong></span>
                  {radiusSaving && <span className="text-gray-500">Saving…</span>}
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  onMouseUp={() => handleRadiusSave(radius)}
                  onTouchEnd={() => handleRadiusSave(radius)}
                  className="w-36 accent-blue-500"
                />
                <div className="flex justify-between text-gray-500" style={{ fontSize: 10 }}>
                  <span>10km</span><span>50km</span>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-gray-300">Radius: <strong className="text-gray-100">{radius}km</strong></span>
                <p className="text-gray-500 mt-0.5" style={{ fontSize: 10 }}>
                  <button
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => router.push('/dashboard/settings/billing')}
                  >
                    Upgrade to Growth
                  </button>{' '}to extend to 50km
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
