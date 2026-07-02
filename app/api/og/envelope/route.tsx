import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') ?? 'Your Company'

  return new ImageResponse(
    (
      <div
        style={{
          width: '600px',
          height: '380px',
          display: 'flex',
          background: '#EDE8DE',
          position: 'relative',
          fontFamily: 'Georgia, serif',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.04)',
        }}
      >
        {/* Clean linen envelope face — no crease triangles on front */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, #F5F1E8 0%, #EDE8DE 40%, #E8E2D4 100%)',
          display: 'flex',
        }} />

        {/* Subtle edge shadow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.6)',
          display: 'flex',
        }} />

        {/* Return address — top left */}
        <div style={{
          position: 'absolute',
          top: 26,
          left: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', letterSpacing: 1.5, textTransform: 'uppercase', display: 'flex' }}>Roweo Pty Ltd</div>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.28)', display: 'flex' }}>Sydney NSW 2000</div>
        </div>

        {/* Postmark — top right area, left of stamp */}
        <div style={{
          position: 'absolute',
          top: 28,
          right: 112,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '1.5px solid rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}>
          <div style={{ fontSize: 7, color: 'rgba(0,0,0,0.4)', letterSpacing: 2, textTransform: 'uppercase', display: 'flex' }}>ROWEO</div>
          <div style={{ width: 34, height: 1, background: 'rgba(0,0,0,0.2)', display: 'flex' }} />
          <div style={{ fontSize: 8, color: 'rgba(0,0,0,0.45)', fontWeight: 700, display: 'flex' }}>AUS</div>
          <div style={{ width: 34, height: 1, background: 'rgba(0,0,0,0.2)', display: 'flex' }} />
          <div style={{ fontSize: 7, color: 'rgba(0,0,0,0.3)', display: 'flex' }}>2026</div>
        </div>

        {/* Stamp — top right */}
        <div style={{
          position: 'absolute',
          top: 22,
          right: 28,
          width: 68,
          height: 80,
          background: 'white',
          border: '1px solid rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
        }}>
          {/* Perforated edge effect — inner */}
          <div style={{
            width: 56,
            height: 68,
            background: 'linear-gradient(135deg, #1B2A4A 0%, #243660 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}>
            <div style={{ fontSize: 22, color: 'white', fontWeight: 800, display: 'flex' }}>R</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.55)', letterSpacing: 2.5, textTransform: 'uppercase', display: 'flex' }}>ROWEO</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', display: 'flex' }}>AUSTRALIA</div>
          </div>
        </div>

        {/* Centre — recipient name */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -38%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 8,
        }}>
          <div style={{
            fontSize: name.length > 32 ? 19 : name.length > 22 ? 23 : 28,
            fontWeight: 400,
            color: '#2C2419',
            letterSpacing: name.length > 25 ? 0.5 : 2,
            fontStyle: 'italic',
            maxWidth: 380,
            textAlign: 'center',
            lineHeight: 1.35,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {name}
          </div>
          <div style={{ width: 48, height: 1, background: 'rgba(0,0,0,0.18)', display: 'flex' }} />
          <div style={{
            fontSize: 9,
            color: 'rgba(0,0,0,0.32)',
            letterSpacing: 3.5,
            textTransform: 'uppercase',
            display: 'flex',
          }}>
            Personal &amp; Confidential
          </div>
        </div>

        {/* Bottom strip — very subtle address line guide */}
        <div style={{
          position: 'absolute',
          bottom: 28,
          left: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
          <div style={{ width: 80, height: 1, background: 'rgba(0,0,0,0.1)', display: 'flex' }} />
          <div style={{ width: 60, height: 1, background: 'rgba(0,0,0,0.07)', display: 'flex' }} />
        </div>

      </div>
    ),
    { width: 600, height: 380 }
  )
}
