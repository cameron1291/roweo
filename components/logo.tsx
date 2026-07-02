import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'full' | 'mark'
  className?: string
  href?: string
  height?: number
}

export function Logo({ variant = 'full', className, href = '/', height = 32 }: LogoProps) {
  // logo.png cropped to 1143×348 (3.28:1). logo-mark.png cropped to ~1:1.
  const src = variant === 'mark' ? '/logo-mark.png' : '/logo.png'
  const width = variant === 'mark' ? Math.round(height * 1.1) : Math.round(height * 3.28)

  const img = (
    <Image
      src={src}
      alt="Roweo"
      width={width}
      height={height}
      priority
      className={cn('object-contain object-left', className)}
    />
  )

  if (href) {
    return <Link href={href}>{img}</Link>
  }

  return img
}
