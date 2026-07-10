import {
  Document, Page, Text, View, Image, StyleSheet, Font, Svg,
  Path, Rect, Circle,
} from '@react-pdf/renderer'
import path from 'path'

Font.registerHyphenationCallback(word => [word])

try {
  Font.register({
    family: 'DancingScript',
    src: path.join(process.cwd(), 'public', 'fonts', 'DancingScript.ttf'),
  })
} catch { /* fallback */ }

const NAVY  = '#1B2A4A'
const BLUE  = '#3B6FDB'
const GREY  = '#6B7280'
const LGREY = '#F3F4F6'
const BGREY = '#E5E7EB'

const PAD  = 38
const LCOL = 308
const RCOL = 169

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#1F2937',
    paddingHorizontal: PAD,
    paddingTop: 18,
    paddingBottom: 80,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerDate: { fontSize: 9, color: GREY, letterSpacing: 0.3, marginTop: 8 },

  // Envelope window — positioned at 142pt (~50mm) from top for DL window envelope
  // paddingTop(18) + logo+text(~67pt) = ~85pt already, add marginTop(57) = 142pt total
  envBox: {
    marginTop: 57,
    paddingLeft: 0,
    paddingVertical: 4,
    width: 200,
    marginBottom: 14,
  },
  envLine: { fontSize: 9.5, color: NAVY, lineHeight: 1.55 },

  // Two-column body
  cols: { flexDirection: 'row', gap: 20 },
  lcol: { width: LCOL, flexDirection: 'column' },
  rcol: { width: RCOL },

  // Left column
  eyebrow: {
    fontSize: 8,
    fontFamily: 'DancingScript',
    color: BLUE,
    marginBottom: 6,
  },
  headline: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  accent: {
    width: 30,
    height: 2.5,
    backgroundColor: BLUE,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 9.5,
    lineHeight: 1.55,
    color: '#374151',
    marginBottom: 7,
  },
  bold: { fontFamily: 'Helvetica-Bold', color: BLUE },

  // Features
  features: { marginTop: 4, marginBottom: 10 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: BGREY,
  },
  featureCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BGREY,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: { flex: 1, paddingTop: 1 },
  featureTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 },
  featureDesc: { fontSize: 8.5, color: GREY, lineHeight: 1.5 },

  // Signature
  sigBlock: { marginTop: 'auto', paddingTop: 14 },
  sigHandwriting: { fontSize: 20, fontFamily: 'DancingScript', color: NAVY, marginBottom: 2 },
  sigTitle: { fontSize: 8, color: GREY, marginBottom: 5 },
  sigContactRow: { flexDirection: 'row', gap: 14, marginTop: 2 },
  sigContact: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLUE },

  // Right column — stats panel
  statsPanel: {
    backgroundColor: LGREY,
    borderRadius: 4,
    padding: 14,
    marginBottom: 10,
  },
  statsPanelLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  daCount: {
    fontSize: 42,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    lineHeight: 1,
    marginBottom: 2,
    marginTop: 4,
  },
  daLabel: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: NAVY, lineHeight: 1.3, marginBottom: 1 },
  daSubLabel: { fontSize: 7.5, color: GREY, marginBottom: 10 },
  divider: { height: 1, backgroundColor: BGREY, marginBottom: 10 },
  miniStats: { flexDirection: 'row', gap: 10 },
  miniStat: { flex: 1 },
  miniStatVal: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 1, marginTop: 4 },
  miniStatLabel: { fontSize: 7, color: GREY, lineHeight: 1.4 },

  // QR box
  qrBox: {
    borderWidth: 1.5,
    borderColor: BLUE,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
  },
  qrBoxHeadline: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'center',
    lineHeight: 1.35,
    marginBottom: 7,
  },
  qrBoxAccent: { color: BLUE },
  qrCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
    alignSelf: 'flex-start',
  },
  qrCheckText: { fontSize: 7.5, color: GREY, lineHeight: 1.4 },
  qrImg: { width: 88, height: 88, marginTop: 6, marginBottom: 5 },
  qrCaption: { fontSize: 7, color: GREY, textAlign: 'center', lineHeight: 1.4 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: PAD,
    right: PAD,
  },
  footerDivider: { height: 1, backgroundColor: BGREY, marginBottom: 8 },
  footerContacts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 6,
  },
  footerContact: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerContactText: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: NAVY },
  footerMeta: { fontSize: 7.5, color: GREY, textAlign: 'center', marginBottom: 3 },
  disclaimer: { fontSize: 6.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 },
  disclaimerBold: { fontFamily: 'Helvetica-Bold', color: '#6B7280' },
})

// Icons
function HouseIcon({ size = 11 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 10.5L12 3L21 10.5V21H15V14H9V21H3V10.5Z" fill="none" stroke={NAVY} strokeWidth="1.8" />
    </Svg>
  )
}
function EnvelopeIcon({ size = 11 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke={NAVY} strokeWidth="1.8" />
      <Path d="M2 7L12 13.5L22 7" fill="none" stroke={NAVY} strokeWidth="1.8" />
    </Svg>
  )
}
function BarChartIcon({ size = 11 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="12" width="4" height="9" fill={NAVY} />
      <Rect x="10" y="7" width="4" height="14" fill={NAVY} />
      <Rect x="17" y="3" width="4" height="18" fill={NAVY} />
    </Svg>
  )
}
function PhoneIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24C17.49 15.36 18.73 15.6 20 15.6c.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.01L6.6 10.8z" fill={BLUE} />
    </Svg>
  )
}
function EmailIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="4" width="20" height="16" rx="2" fill={BLUE} />
      <Path d="M2 7L12 13.5L22 7" fill="none" stroke="white" strokeWidth="1.6" />
    </Svg>
  )
}
function GlobeIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" fill="none" stroke={BLUE} strokeWidth="1.8" />
      <Path d="M2 12h20M12 2c-3.5 4-3.5 16 0 20M12 2c3.5 4 3.5 16 0 20" fill="none" stroke={BLUE} strokeWidth="1.5" />
    </Svg>
  )
}
function PinIcon({ size = 11 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={BLUE} />
    </Svg>
  )
}
function TrendIcon({ size = 11 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 17L9 11L13 15L21 7" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" />
      <Path d="M17 7H21V11" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}
function CheckIcon({ size = 8 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12L10 17L19 7" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

export interface AcquisitionLetterProps {
  prospectCompanyName: string
  prospectAddress?: string | null
  prospectSuburb?: string | null
  serviceArea?: string | null
  letterBodyText?: string | null
  qrCodeDataUrl?: string | null
  logoDataUrl?: string | null
  demoUrl?: string
  stats?: {
    dasThisMonth: number
    matchingSuburbs: number
    avgResponseRate: string
  }
  letterDate?: string
}

export function AcquisitionLetterPage({ props }: { props: AcquisitionLetterProps }) {
  const date = (props.letterDate ?? new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })).toUpperCase()

  const stats = props.stats ?? { dasThisMonth: 47, matchingSuburbs: 3, avgResponseRate: '3.8%' }

  return (
      <Page size="A4" style={S.page}>

        {/* HEADER */}
        <View style={S.header}>
          <View>
            {props.logoDataUrl ? (
              <Image style={{ width: 148, height: 45, objectFit: 'contain' }} src={props.logoDataUrl} />
            ) : (
              <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY }}>Roweo</Text>
            )}
            <Text style={{ fontFamily: 'DancingScript', fontSize: 15, color: BLUE, marginTop: 2 }}>
              Development Intelligence
            </Text>
          </View>
          <Text style={S.headerDate}>{date}</Text>
        </View>

        {/* ENVELOPE WINDOW — no border */}
        <View style={S.envBox}>
          <Text style={S.envLine}>{props.prospectCompanyName}</Text>
          {props.prospectAddress && <Text style={S.envLine}>{props.prospectAddress}</Text>}
          {props.prospectSuburb && <Text style={S.envLine}>{props.prospectSuburb}</Text>}
        </View>

        {/* TWO-COLUMN BODY */}
        <View style={S.cols}>

          {/* LEFT */}
          <View style={S.lcol}>
            <Text style={S.eyebrow}>A personalised preview for {props.prospectCompanyName}</Text>

            <Text style={S.headline}>Your next client{'\n'}is already at council.</Text>
            <View style={S.accent} />

            <Text style={S.bodyText}>
              Every week, homeowners in {props.serviceArea ?? 'your area'} lodge Development Applications at council. They're planning renovations, extensions, knockdown rebuilds — and most haven't chosen a builder yet. The decision hasn't been made. Nobody has been called.
            </Text>

            <Text style={S.bodyText}>
              In the last 30 days, <Text style={S.bold}>{stats.dasThisMonth} residential projects</Text> were lodged in {props.prospectCompanyName}'s service area. Each one is a homeowner with real plans and no builder locked in. Roweo identifies them the moment their DA hits the portal and posts your branded letter to their door — before your competitors know the job exists.
            </Text>

            <View style={S.features}>
              {([
                { Icon: HouseIcon, title: 'Real projects. Real homeowners.', desc: 'We track residential DAs lodged at council in your service area in near real time — not aged leads from a directory.' },
                { Icon: EnvelopeIcon, title: 'Your letter. Their doorstep.', desc: 'We create and post a personalised letter with your branding within 2 business days of lodgement.' },
                { Icon: BarChartIcon, title: "Know who's interested.", desc: "Every letter has a unique QR code. When a homeowner scans it, you're notified instantly — so you follow up at exactly the right moment." },
              ] as const).map(({ Icon, title, desc }, i) => (
                <View key={i} style={[S.featureRow, i === 2 ? { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 } : {}]}>
                  <View style={S.featureCircle}><Icon /></View>
                  <View style={S.featureText}>
                    <Text style={S.featureTitle}>{title}</Text>
                    <Text style={S.featureDesc}>{desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Handwritten sign-off */}
            <View style={S.sigBlock}>
              <Text style={S.sigHandwriting}>The Roweo Team</Text>
              <Text style={S.sigTitle}>Roweo — Development Intelligence for Residential Builders</Text>
              <View style={S.sigContactRow}>
                <Text style={S.sigContact}>0401 102 607</Text>
                <Text style={S.sigContact}>hello@roweo.com.au</Text>
              </View>
            </View>
          </View>

          {/* RIGHT */}
          <View style={S.rcol}>
            {/* Stats panel — "Residential Projects" not "Development Applications" */}
            <View style={S.statsPanel}>
              <Text style={S.statsPanelLabel}>Last 30 days</Text>
              <HouseIcon size={18} />
              <Text style={S.daCount}>{stats.dasThisMonth}</Text>
              <Text style={S.daLabel}>Residential{'\n'}Projects</Text>
              <Text style={S.daSubLabel}>Near your business</Text>
              <View style={S.divider} />
              <View style={S.miniStats}>
                <View style={S.miniStat}>
                  <PinIcon />
                  <Text style={S.miniStatVal}>{stats.matchingSuburbs}</Text>
                  <Text style={S.miniStatLabel}>Matching{'\n'}Suburbs</Text>
                </View>
                <View style={S.miniStat}>
                  <TrendIcon />
                  <Text style={S.miniStatVal}>{stats.avgResponseRate}</Text>
                  <Text style={S.miniStatLabel}>Average{'\n'}Scan Rate</Text>
                </View>
              </View>
            </View>

            {/* QR box — curiosity-driven CTA */}
            <View style={S.qrBox}>
              <Text style={S.qrBoxHeadline}>
                See the <Text style={S.qrBoxAccent}>{stats.dasThisMonth} projects</Text>{'\n'}
                your competitors{'\n'}
                haven't contacted yet.
              </Text>

              {/* Checklist */}
              {[
                `Your suburbs`,
                `Your branding`,
                `Your homeowner letter`,
                `Live projects nearby`,
              ].map((item, i) => (
                <View key={i} style={S.qrCheckRow}>
                  <CheckIcon />
                  <Text style={S.qrCheckText}>{item}</Text>
                </View>
              ))}

              {props.qrCodeDataUrl
                ? <Image style={S.qrImg} src={props.qrCodeDataUrl} />
                : <View style={[S.qrImg, { backgroundColor: LGREY, borderRadius: 4 }]} />
              }
              <Text style={S.qrCaption}>Takes less than 2 minutes</Text>
            </View>
          </View>

        </View>

        {/* FOOTER */}
        <View style={S.footer}>
          <View style={S.footerDivider} />
          <View style={S.footerContacts}>
            <View style={S.footerContact}>
              <PhoneIcon />
              <Text style={S.footerContactText}>0401 102 607</Text>
            </View>
            <View style={S.footerContact}>
              <EmailIcon />
              <Text style={S.footerContactText}>hello@roweo.com.au</Text>
            </View>
            <View style={S.footerContact}>
              <GlobeIcon />
              <Text style={S.footerContactText}>roweo.com.au</Text>
            </View>
          </View>
          <Text style={S.footerMeta}>Roweo Pty Ltd (ABN 31 683 026 924)  |  Sydney NSW, Australia</Text>
          <Text style={S.footerMeta}>Flat monthly subscription. No lock-in contracts. Cancel anytime.</Text>
          <Text style={S.disclaimer}>
            This letter is commercial correspondence from Roweo. If you do not wish to receive further letters from us,{'\n'}
            please email hello@roweo.com.au or visit <Text style={S.disclaimerBold}>roweo.com.au/opt-out</Text> and we will remove you from our mailing list.
          </Text>
        </View>

      </Page>
  )
}

export function AcquisitionLetterDocument({ props }: { props: AcquisitionLetterProps }) {
  return (
    <Document>
      <AcquisitionLetterPage props={props} />
    </Document>
  )
}
