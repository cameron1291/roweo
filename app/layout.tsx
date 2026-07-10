import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'

export const metadata: Metadata = {
  title: { default: 'Roweo — Development Intelligence for Australian Builders', template: '%s | Roweo' },
  description:
    'Get matched to homeowners who have lodged development applications in your area. Roweo sends professional letters on your behalf and tracks who responds. From $149/month.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: APP_URL,
    siteName: 'Roweo',
    title: 'Roweo — Development Intelligence for Australian Builders',
    description: 'DA leads for NSW and ACT builders. Professional letters, QR tracking, instant quote requests. From $149/month, no contracts.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Roweo — Development Intelligence for Australian Builders' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roweo — Development Intelligence for Australian Builders',
    description: 'DA leads for NSW and ACT builders. Letters, QR tracking, instant notifications. From $149/month.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="alternate" href="https://www.roweo.com.au" hrefLang="en-AU" />
        <link rel="alternate" href="https://www.roweo.com.au" hrefLang="x-default" />
        <link rel="preconnect" href="https://bibfvkjodmaufdgtrmjx.supabase.co" />
        <link rel="preconnect" href="https://js.stripe.com" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-[#1B2A4A] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
