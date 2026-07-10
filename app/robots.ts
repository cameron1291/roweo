import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/onboarding/',
          '/checkout/',
          '/api/',
          '/auth/',
          '/open/',
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'}/sitemap.xml`,
  }
}
