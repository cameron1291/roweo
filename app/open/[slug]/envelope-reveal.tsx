'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  slug: string
  companyName: string
  suburb: string
  demoUrl: string
}

type Phase = 'sealed' | 'opening' | 'revealed'

const NAVY = '#1B2A4A'
const BLUE = '#3B6FDB'
const GREY = '#6B7280'
const LGREY = '#F3F4F6'
const BGREY = '#E5E7EB'

const STATS = { dasThisMonth: 47, matchingSuburbs: 3, avgResponseRate: '3.8%' }

export function EnvelopeReveal({ slug, companyName, suburb, demoUrl }: Props) {
  const [phase, setPhase] = useState<Phase>('sealed')
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    if (!tracked) {
      fetch('/api/open/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, event: 'envelope_page_viewed' }),
      })
      setTracked(true)
    }
  }, [slug, tracked])

  function open() {
    if (phase !== 'sealed') return
    fetch('/api/open/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, event: 'envelope_opened' }),
    })
    setPhase('opening')
    setTimeout(() => {
      setPhase('revealed')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 1100)
  }

  function trackCtaClick() {
    fetch('/api/open/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, event: 'envelope_cta_clicked' }),
    })
  }

  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');

        @keyframes flapOpen {
          0%   { transform: perspective(600px) rotateX(0deg); }
          100% { transform: perspective(600px) rotateX(-180deg); }
        }
        @keyframes letterFadeIn {
          0%   { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes sealPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,111,219,0.4); }
          50%       { box-shadow: 0 0 0 12px rgba(59,111,219,0); }
        }
        .flap-open  { animation: flapOpen 0.9s cubic-bezier(0.4,0,0.2,1) forwards; transform-origin: top center; }
        .letter-in  { animation: letterFadeIn 0.7s ease both; }
        .seal-pulse { animation: sealPulse 2s ease-in-out infinite; }

        .letter-cols {
          display: flex;
          gap: 20px;
        }
        .letter-right {
          width: 160px;
          flex-shrink: 0;
        }
        @media (max-width: 600px) {
          .letter-cols {
            flex-direction: column;
          }
          .letter-right {
            width: 100%;
            display: flex;
            gap: 12px;
          }
          .letter-stats-panel {
            flex: 1;
          }
          .letter-qr-box {
            flex: 1;
          }
        }
      `}</style>

      {/* ── SEALED / OPENING ── */}
      {phase !== 'revealed' && (
        <div style={{ minHeight: '100vh', background: '#0D1628', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
          <button
            onClick={open}
            disabled={phase === 'opening'}
            style={{ position: 'relative', width: 300, height: 206, cursor: phase === 'opening' ? 'default' : 'pointer', background: 'none', border: 'none', padding: 0 }}
            aria-label="Open your letter"
          >
            {/* Envelope body */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 2, background: 'linear-gradient(160deg,#F7F3EA 0%,#EDE8DC 60%,#E5DFD0 100%)', border: '1px solid rgba(0,0,0,0.14)', boxShadow: '0 24px 64px rgba(0,0,0,0.55),0 4px 16px rgba(0,0,0,0.3)' }}>
              <div style={{ position: 'absolute', top: 14, left: 14, fontSize: 7, color: 'rgba(0,0,0,0.3)', letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.8 }}>
                ROWEO PTY LTD<br />SYDNEY NSW 2000
              </div>
              <div style={{ position: 'absolute', top: 12, right: 14, width: 52, height: 62, background: 'white', border: '1px solid rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 42, height: 52, background: 'linear-gradient(135deg,#1B2A4A,#243660)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <span style={{ fontSize: 18, color: 'white', fontWeight: 800, fontFamily: 'Georgia,serif', lineHeight: 1 }}>R</span>
                  <span style={{ fontSize: 5, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase' }}>ROWEO</span>
                  <span style={{ fontSize: 5, color: 'rgba(255,255,255,0.35)' }}>AUSTRALIA</span>
                </div>
              </div>
              <div style={{ position: 'absolute', top: 14, right: 76, width: 44, height: 44, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 6, color: 'rgba(0,0,0,0.38)', letterSpacing: 1, textTransform: 'uppercase' }}>ROWEO</span>
                <div style={{ width: 26, height: 1, background: 'rgba(0,0,0,0.18)' }} />
                <span style={{ fontSize: 7, color: 'rgba(0,0,0,0.45)', fontWeight: 700 }}>AUS</span>
                <div style={{ width: 26, height: 1, background: 'rgba(0,0,0,0.18)' }} />
                <span style={{ fontSize: 6, color: 'rgba(0,0,0,0.28)' }}>2026</span>
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                <p style={{ margin: 0, color: '#2C2419', fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: companyName.length > 28 ? 13 : companyName.length > 20 ? 16 : 19, letterSpacing: 0.8, textAlign: 'center', maxWidth: 200, lineHeight: 1.3 }}>
                  {companyName}
                </p>
                <div style={{ width: 36, height: 1, background: 'rgba(0,0,0,0.18)', margin: '7px 0' }} />
                <p style={{ margin: 0, fontSize: 7, color: 'rgba(0,0,0,0.28)', letterSpacing: 2.5, textTransform: 'uppercase' }}>Personal &amp; Confidential</p>
              </div>
            </div>

            {/* Flap */}
            <div className={phase === 'opening' ? 'flap-open' : ''} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 103, zIndex: 10, overflow: 'hidden' }}>
              <div style={{ width: 0, height: 0, borderLeft: '150px solid transparent', borderRight: '150px solid transparent', borderTop: '103px solid #DDD7C8' }} />
            </div>

            {/* Wax seal */}
            <div className="seal-pulse" style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', width: 40, height: 40, background: 'linear-gradient(135deg,#3B6FDB,#2855B8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, opacity: phase === 'opening' ? 0 : 1, transition: 'opacity 0.2s' }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>R</span>
            </div>
          </button>

          {phase === 'sealed' && (
            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: 'rgba(147,197,253,0.6)', letterSpacing: 1 }}>Tap to open your letter</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(147,197,253,0.3)', textTransform: 'uppercase', letterSpacing: 2 }}>Prepared for</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{companyName}</p>
            </div>
          )}
        </div>
      )}

      {/* ── REVEALED — matches acquisition letter PDF ── */}
      {phase === 'revealed' && (
        <div style={{ minHeight: '100vh', background: '#0D1628', padding: '24px 12px 64px' }}>
          {/* Top CTA */}
          <div className="letter-in" style={{ maxWidth: 680, margin: '0 auto 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(147,197,253,0.7)' }}>
              See exactly what <strong style={{ color: 'white' }}>{companyName}</strong>&apos;s homeowner letter would look like.
            </p>
            <Link
              href={demoUrl}
              onClick={trackCtaClick}
              style={{ display: 'inline-block', background: BLUE, color: 'white', fontWeight: 700, fontSize: 15, padding: '14px 36px', borderRadius: 6, textDecoration: 'none' }}
            >
              See your homeowner letter →
            </Link>
          </div>

          <div className="letter-in" style={{ maxWidth: 680, margin: '0 auto', background: 'white', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', borderRadius: 2 }}>
            <div style={{ padding: '20px 20px 24px', fontFamily: 'Helvetica, Arial, sans-serif' }}>

              {/* HEADER — logo + date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, paddingBottom: 12, borderBottom: `1px solid ${BGREY}` }}>
                <div>
                  <Image src="/logo.png" alt="Roweo" width={120} height={36} style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: BLUE, fontFamily: "'Dancing Script', cursive, Georgia, serif" }}>Development Intelligence</p>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 9, color: GREY, letterSpacing: 0.3, textAlign: 'right' }}>{today}</p>
              </div>

              {/* ADDRESSEE */}
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 11, color: NAVY, lineHeight: 1.55 }}>{companyName}</p>
                <p style={{ margin: 0, fontSize: 11, color: NAVY, lineHeight: 1.55 }}>{suburb}, NSW</p>
              </div>

              {/* TWO COLUMNS (stacks on mobile) */}
              <div className="letter-cols">

                {/* LEFT */}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: BLUE, fontFamily: "'Dancing Script', cursive, Georgia, serif" }}>
                    A personalised preview for {companyName}
                  </p>
                  <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>
                    Your next client<br />is already at council.
                  </p>
                  <div style={{ width: 30, height: 2.5, background: BLUE, marginBottom: 10 }} />

                  <p style={{ margin: '0 0 8px', fontSize: 11, lineHeight: 1.6, color: '#374151' }}>
                    Every week, homeowners in {suburb} lodge Development Applications at council. They&apos;re planning renovations, extensions, knockdown rebuilds — and most haven&apos;t chosen a builder yet. The decision hasn&apos;t been made. Nobody has been called.
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: 11, lineHeight: 1.6, color: '#374151' }}>
                    In the last 30 days,{' '}
                    <strong style={{ color: BLUE }}>{STATS.dasThisMonth} residential projects</strong>
                    {' '}were lodged in {companyName}&apos;s service area. Each one is a homeowner with real plans and no builder locked in. Roweo identifies them the moment their DA hits the portal and posts your branded letter to their door — before your competitors know the job exists.
                  </p>

                  {/* Features */}
                  <div style={{ marginBottom: 16 }}>
                    {[
                      {
                        icon: <svg width={11} height={11} viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3L21 10.5V21H15V14H9V21H3V10.5Z" stroke={NAVY} strokeWidth="1.8" strokeLinejoin="round" /></svg>,
                        title: 'Real projects. Real homeowners.',
                        desc: 'We track residential DAs lodged at council in your service area in near real time — not aged leads from a directory.',
                      },
                      {
                        icon: <svg width={11} height={11} viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke={NAVY} strokeWidth="1.8" /><path d="M2 7L12 13.5L22 7" stroke={NAVY} strokeWidth="1.8" /></svg>,
                        title: 'Your letter. Their doorstep.',
                        desc: 'We create and post a personalised letter with your branding within 2 business days of lodgement.',
                      },
                      {
                        icon: <svg width={11} height={11} viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9" fill={NAVY} /><rect x="10" y="7" width="4" height="14" fill={NAVY} /><rect x="17" y="3" width="4" height="18" fill={NAVY} /></svg>,
                        title: "Know who's interested.",
                        desc: "Every letter has a unique QR code. When a homeowner scans it, you're notified instantly — so you follow up at exactly the right moment.",
                      },
                    ].map((f, i, arr) => (
                      <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < arr.length - 1 ? 10 : 0, paddingBottom: i < arr.length - 1 ? 10 : 0, borderBottom: i < arr.length - 1 ? `1px solid ${BGREY}` : 'none' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 12, border: `1px solid ${BGREY}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{f.icon}</div>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: NAVY }}>{f.title}</p>
                          <p style={{ margin: 0, fontSize: 10, color: GREY, lineHeight: 1.5 }}>{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Signature */}
                  <div style={{ paddingTop: 12, borderTop: `1px solid ${BGREY}` }}>
                    <p style={{ margin: '0 0 2px', fontSize: 22, color: NAVY, fontFamily: "'Dancing Script', cursive, Georgia, serif" }}>The Roweo Team</p>
                    <p style={{ margin: '0 0 6px', fontSize: 9, color: GREY }}>Roweo — Development Intelligence for Residential Builders</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: BLUE }}>0401 102 607</p>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: BLUE }}>hello@roweo.com.au</p>
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="letter-right">

                  {/* Stats panel */}
                  <div className="letter-stats-panel" style={{ background: LGREY, borderRadius: 4, padding: 14, marginBottom: 12 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 8, fontWeight: 700, color: BLUE, letterSpacing: 1.2, textTransform: 'uppercase' }}>Last 30 days</p>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}><path d="M3 10.5L12 3L21 10.5V21H15V14H9V21H3V10.5Z" stroke={NAVY} strokeWidth="1.8" strokeLinejoin="round" /></svg>
                    <p style={{ margin: '4px 0 2px', fontSize: 40, fontWeight: 800, color: BLUE, lineHeight: 1 }}>{STATS.dasThisMonth}</p>
                    <p style={{ margin: '0 0 1px', fontSize: 11, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>Residential<br />Projects</p>
                    <p style={{ margin: '0 0 10px', fontSize: 9, color: GREY }}>Near your business</p>
                    <div style={{ height: 1, background: BGREY, marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={BLUE} /></svg>
                        <p style={{ margin: '4px 0 1px', fontSize: 16, fontWeight: 800, color: NAVY }}>{STATS.matchingSuburbs}</p>
                        <p style={{ margin: 0, fontSize: 8, color: GREY, lineHeight: 1.4 }}>Matching<br />Suburbs</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}><path d="M3 17L9 11L13 15L21 7" stroke={BLUE} strokeWidth="2" strokeLinecap="round" /><path d="M17 7H21V11" stroke={BLUE} strokeWidth="2" strokeLinecap="round" /></svg>
                        <p style={{ margin: '4px 0 1px', fontSize: 16, fontWeight: 800, color: NAVY }}>{STATS.avgResponseRate}</p>
                        <p style={{ margin: 0, fontSize: 8, color: GREY, lineHeight: 1.4 }}>Average<br />Scan Rate</p>
                      </div>
                    </div>
                  </div>

                  {/* QR box */}
                  <div className="letter-qr-box" style={{ border: `1.5px solid ${BLUE}`, borderRadius: 4, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: NAVY, textAlign: 'center', lineHeight: 1.35 }}>
                      See the <span style={{ color: BLUE }}>{STATS.dasThisMonth} projects</span><br />your competitors<br />haven&apos;t contacted yet.
                    </p>
                    {['Your suburbs', 'Your branding', 'Your homeowner letter', 'Live projects nearby'].map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, alignSelf: 'flex-start' }}>
                        <svg width={9} height={9} viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" /></svg>
                        <p style={{ margin: 0, fontSize: 9, color: GREY, lineHeight: 1.4 }}>{item}</p>
                      </div>
                    ))}
                    <div style={{ width: 88, height: 88, marginTop: 8, marginBottom: 5, background: LGREY, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width={68} height={68} viewBox="0 0 68 68" fill="none">
                        <rect x="0" y="0" width="28" height="28" rx="2" fill={NAVY} /><rect x="40" y="0" width="28" height="28" rx="2" fill={NAVY} /><rect x="0" y="40" width="28" height="28" rx="2" fill={NAVY} />
                        <rect x="5" y="5" width="18" height="18" fill="white" /><rect x="45" y="5" width="18" height="18" fill="white" /><rect x="5" y="45" width="18" height="18" fill="white" />
                        <rect x="9" y="9" width="10" height="10" fill={NAVY} /><rect x="49" y="9" width="10" height="10" fill={NAVY} /><rect x="9" y="49" width="10" height="10" fill={NAVY} />
                        <rect x="40" y="40" width="8" height="8" fill={NAVY} /><rect x="52" y="40" width="8" height="8" fill={NAVY} /><rect x="60" y="40" width="8" height="8" fill={NAVY} /><rect x="40" y="52" width="8" height="8" fill={NAVY} /><rect x="60" y="60" width="8" height="8" fill={NAVY} />
                      </svg>
                    </div>
                    <p style={{ margin: 0, fontSize: 8, color: GREY, textAlign: 'center', lineHeight: 1.4 }}>Takes less than 2 minutes</p>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div style={{ marginTop: 28, paddingTop: 12, borderTop: `1px solid ${BGREY}` }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 8, flexWrap: 'wrap' }}>
                  {[
                    { icon: <svg width={13} height={13} viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24C17.49 15.36 18.73 15.6 20 15.6c.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.01L6.6 10.8z" fill={BLUE} /></svg>, label: '0401 102 607' },
                    { icon: <svg width={13} height={13} viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" fill={BLUE} /><path d="M2 7L12 13.5L22 7" stroke="white" strokeWidth="1.6" /></svg>, label: 'hello@roweo.com.au' },
                    { icon: <svg width={13} height={13} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke={BLUE} strokeWidth="1.8" fill="none" /><path d="M2 12h20M12 2c-3.5 4-3.5 16 0 20M12 2c3.5 4 3.5 16 0 20" stroke={BLUE} strokeWidth="1.5" fill="none" /></svg>, label: 'roweo.com.au' },
                  ].map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {c.icon}
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: NAVY }}>{c.label}</p>
                    </div>
                  ))}
                </div>
                <p style={{ margin: '0 0 3px', fontSize: 9, color: GREY, textAlign: 'center' }}>Roweo Pty Ltd (ABN 31 683 026 924) | Sydney NSW, Australia</p>
                <p style={{ margin: '0 0 3px', fontSize: 9, color: GREY, textAlign: 'center' }}>Flat monthly subscription. No lock-in contracts. Cancel anytime.</p>
                <p style={{ margin: 0, fontSize: 8, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
                  This letter is commercial correspondence from Roweo. If you do not wish to receive further letters,<br />
                  email hello@roweo.com.au or visit <strong style={{ color: '#6B7280' }}>roweo.com.au/opt-out</strong>.
                </p>
              </div>
            </div>

            {/* CTA strip */}
            <div style={{ borderTop: `1px solid ${BGREY}`, padding: '24px 20px', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 14, color: GREY, textAlign: 'center' }}>
                See exactly what <strong style={{ color: NAVY }}>{companyName}</strong>&apos;s homeowner letter would look like.
              </p>
              <Link
                href={demoUrl}
                onClick={trackCtaClick}
                style={{ display: 'block', width: '100%', textAlign: 'center', background: NAVY, color: 'white', fontWeight: 700, fontSize: 15, padding: '16px 24px', borderRadius: 6, textDecoration: 'none', boxSizing: 'border-box' }}
              >
                See your homeowner letter →
              </Link>
              <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>No login required · Takes less than 2 minutes</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
