import { createServiceClient } from '@/lib/supabase-server'

// Persistent rate limiting backed by Supabase.
// Uses an upsert on a rate_limits table so limits survive cold starts.
// Falls back to allowing the request if the DB call fails — never block on infra errors.

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number }> {
  try {
    const supabase = createServiceClient()
    const now = Date.now()
    const windowStart = now - windowMs

    // Upsert: increment hit count if key exists within window, or create new entry
    const { data, error } = await supabase.rpc('rate_limit_check', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    })

    if (error || data === null) {
      // Fail open — never block legitimate users due to infra issues
      return { success: true, remaining: limit }
    }

    return {
      success: data.allowed as boolean,
      remaining: Math.max(0, (data.remaining as number) ?? 0),
    }
  } catch {
    return { success: true, remaining: limit }
  }
}

// Simple in-process fallback for non-critical paths where DB latency isn't worth it
const hitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimitSync(
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
