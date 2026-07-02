import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import QRCode from 'qrcode'
import { LetterDocument, type LetterProps } from './letter-document'

export async function generateLetterPdf(props: LetterProps): Promise<Buffer> {
  // Generate QR code as base64 PNG (embeddable in react-pdf <Image>)
  if (props.qrUrl && !props.qrCodeDataUrl) {
    props = {
      ...props,
      qrCodeDataUrl: await QRCode.toDataURL(props.qrUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#1B2A4A', light: '#FFFFFF' },
      }),
    }
  }

  const element = createElement(LetterDocument, props) as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}

// Generate a multi-page batch PDF from multiple letters
export async function generateBatchPdf(letters: LetterProps[]): Promise<Buffer> {
  const { Document } = await import('@react-pdf/renderer')
  const { LetterPage } = await import('./letter-document')

  // Pre-generate all QR codes in parallel
  const withQr = await Promise.all(
    letters.map(async (props) => {
      if (props.qrUrl && !props.qrCodeDataUrl) {
        return {
          ...props,
          qrCodeDataUrl: await QRCode.toDataURL(props.qrUrl, {
            width: 200,
            margin: 1,
            color: { dark: '#1B2A4A', light: '#FFFFFF' },
          }),
        }
      }
      return props
    })
  )

  // One Document, one LetterPage per letter — avoids nested <Document> elements
  const element = createElement(
    Document,
    {},
    ...withQr.map((props, i) =>
      createElement(LetterPage, { ...props, key: i })
    )
  ) as ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
