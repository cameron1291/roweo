import { createClient } from '@supabase/supabase-js'

// Simple rate limiting using Supabase. No Upstash dependency at MVP.
// Stores hit counts in memory per worker process — resets on cold start.
// For MVP traffic volumes this is sufficient. Upgrade to Upstash Redis when needed.

const hitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = hitMap.get(key)

  if (!entry || now > entry.resetAt) {
    hitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count }
}
