import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'

export const metadata: Metadata = {
  title: { default: 'Roweo — DA Leads for Australian Builders', template: '%s | Roweo' },
  description:
    'Find homeowners planning renovations before your competitors do. Roweo matches you to development applications in your service area and sends professional letters on your behalf.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: APP_URL,
    siteName: 'Roweo',
    title: 'Roweo — DA Leads for Australian Builders',
    description: 'Match to homeowners planning renovations and extensions. Professional letters, automatic DA matching, QR scan tracking. $299/mo, no lock-in.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Roweo — DA Leads for Australian Builders' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roweo — DA Leads for Australian Builders',
    description: 'Match to homeowners planning renovations and extensions in your service area. $299/mo.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
