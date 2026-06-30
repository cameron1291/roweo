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
  const src = variant === 'mark' ? '/logo-mark.png' : '/logo.png'
  const width = variant === 'mark' ? height : height * 3

  const img = (
    <Image
      src={src}
      alt="Roweo"
      width={width}
      height={height}
      priority
      className={cn('object-contain', className)}
    />
  )

  if (href) {
    return <Link href={href}>{img}</Link>
  }

  return img
}
