import {
  Document, Page, Text, View, Image, StyleSheet, Font, Svg,
  Path, Rect, Circle, Line, G,
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
const BORDER = '#E5E7EB'
const PAD = 36

export interface LetterProps {
  companyName: string
  logoUrl?: string | null
  brandColor?: string
  phone?: string | null
  website?: string | null
  licenseNumber?: string | null
  tagline?: string | null
  letterGreeting?: string
  letterSignOff?: string
  complianceDisclaimer?: string

  daAddress: string
  daSuburb: string
  daState: string
  daPostcode?: string | null
  daDescription: string
  daProjectType: string
  daLodgedDate?: string | null
  daDaNumber?: string | null

  letterBodyText: string

  qrCodeDataUrl?: string | null
  qrUrl?: string
  letterNote?: string

  letterDate?: string
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },

  // ── HEADER ROW ─────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: PAD,
    paddingTop: 28,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },

  companyNameFallback: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    letterSpacing: 0.3,
  },
  logoImg: {
    height: 32,
    width: 120,
    objectFit: 'contain',
    objectPositionX: 'left',
  },

  // Neighbourhood tag (top right)
  nbhTag: { alignItems: 'flex-end' },
  nbhLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 0.8, marginBottom: 2 },
  nbhSub: { fontSize: 7.5, color: GREY, lineHeight: 1.4, textAlign: 'right' },

  // ── ENVELOPE WINDOW ADDRESS ───────────────────────────────────────────
  // DL window: ~20mm from left, window top ~55mm from top of letter
  addressZone: {
    paddingLeft: PAD,
    paddingRight: PAD,
    paddingTop: 22,
    paddingBottom: 16,
    minHeight: 72,
  },
  addressLabel: { fontSize: 7, color: GREY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  addressLine: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY, lineHeight: 1.5 },

  // ── TWO-COLUMN BODY ───────────────────────────────────────────────────
  cols: {
    flexDirection: 'row',
    paddingHorizontal: PAD,
    paddingTop: 4,
    gap: 16,
  },
  lcol: { flex: 1 },
  rcol: { width: 148 },

  // LEFT COLUMN
  greeting: { fontSize: 9.5, color: GREY, marginBottom: 8 },
  headline: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    lineHeight: 1.25,
    marginBottom: 8,
  },
  headlineBlue: { color: BLUE },
  accent: { width: 24, height: 2, backgroundColor: BLUE, marginBottom: 12 },

  bodyText: { fontSize: 9.5, color: '#374151', lineHeight: 1.55, marginBottom: 8 },

  // DA address box
  daBox: {
    backgroundColor: LGREY,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 10,
    marginTop: 2,
  },
  daBoxText: { flex: 1 },
  daBoxTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  daBoxSub: { fontSize: 8, color: GREY },
  daBoxSubBlue: { color: BLUE, fontFamily: 'Helvetica-Bold' },

  // Feature rows
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  featureCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0.75,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 1 },
  featureDesc: { fontSize: 7.5, color: GREY, lineHeight: 1.45 },

  // Note section
  noteTitle: { fontSize: 14, fontFamily: 'DancingScript', color: NAVY, marginBottom: 4, marginTop: 10 },
  noteAccent: { width: 20, height: 1.5, backgroundColor: BLUE, marginBottom: 8 },
  noteText: { fontSize: 9, color: '#374151', lineHeight: 1.55, marginBottom: 6 },
  signatureName: { fontSize: 16, fontFamily: 'DancingScript', color: NAVY, marginTop: 6 },

  // RIGHT COLUMN
  qrCard: {
    borderWidth: 1,
    borderColor: BLUE,
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  qrCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.75,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  qrCardTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'center', lineHeight: 1.3, marginBottom: 4 },
  qrCardAccent: { width: 20, height: 1.5, backgroundColor: BLUE, marginBottom: 8 },
  qrCardSub: { fontSize: 7.5, color: GREY, textAlign: 'center', lineHeight: 1.5, marginBottom: 8 },
  qrImg: { width: 90, height: 90, marginBottom: 4 },
  qrCaption: { fontSize: 7, color: GREY, textAlign: 'center', fontFamily: 'Helvetica-Oblique' },

  // Security badge
  secBadge: {
    backgroundColor: NAVY,
    borderRadius: 5,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 10,
  },
  secCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  secTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 2 },
  secSub: { fontSize: 7, color: '#93C5FD', lineHeight: 1.4 },

  // Supporting note
  supportNote: { alignItems: 'center', gap: 4, paddingTop: 4 },
  supportCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 0.75,
    borderColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportText: { fontSize: 8.5, fontFamily: 'DancingScript', color: NAVY, textAlign: 'center', lineHeight: 1.4 },

  // ── FOOTER ────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    backgroundColor: LGREY,
    paddingVertical: 6,
    paddingHorizontal: PAD,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  footerPowered: { fontSize: 7, color: GREY },
  footerBrand: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BLUE },
  footerMeta: {
    position: 'absolute',
    bottom: 28,
    left: PAD,
    right: PAD,
    fontSize: 6.5,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 1.5,
  },
})

// Pin icon SVG
function PinIcon() {
  return (
    <Svg width="10" height="12" viewBox="0 0 10 12">
      <Path d="M5 0C2.8 0 1 1.8 1 4c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill={BLUE}/>
    </Svg>
  )
}

// House icon SVG
function HouseIcon() {
  return (
    <Svg width="16" height="16" viewBox="0 0 16 16">
      <Path d="M2 7.5L8 2l6 5.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V7.5z" stroke={BLUE} strokeWidth="1.2" fill="none"/>
      <Path d="M5.5 15V9.5h5V15" stroke={BLUE} strokeWidth="1.2"/>
    </Svg>
  )
}

// Lock icon SVG
function LockIcon() {
  return (
    <Svg width="10" height="12" viewBox="0 0 10 12">
      <Rect x="1" y="5" width="8" height="6" rx="1.5" stroke="white" strokeWidth="1"/>
      <Path d="M2.5 5V3.5a2.5 2.5 0 015 0V5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </Svg>
  )
}

// Heart icon SVG
function HeartIcon() {
  return (
    <Svg width="12" height="11" viewBox="0 0 12 11">
      <Path d="M6 10S1 6.8 1 3.5A2.5 2.5 0 016 2a2.5 2.5 0 015 1.5C11 6.8 6 10 6 10z" fill={BLUE}/>
    </Svg>
  )
}

// Check icon SVG
function CheckIcon() {
  return (
    <Svg width="8" height="7" viewBox="0 0 8 7">
      <Path d="M1 3.5l2 2L7 1" stroke={BLUE} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  )
}

const DEFAULT_NOTE_TEXT = `We know that getting the right builder makes all the difference. We're a local team and we take real pride in our work. Scan the code and take a look — we'd love to hear from you.\n\nWishing you all the best with your project!`

const PROJECT_LABEL: Record<string, string> = {
  new_dwelling: 'New Dwelling',
  extension: 'Extension / Addition',
  renovation: 'Renovation',
  granny_flat: 'Granny Flat',
  duplex: 'Duplex',
  pool: 'Swimming Pool',
  demolition: 'Demolition',
  other: 'Development Application',
}

export function LetterDocument(props: LetterProps) {
  const {
    companyName,
    logoUrl,
    phone,
    website,
    licenseNumber,
    tagline,
    letterGreeting = 'Hi there',
    letterSignOff = 'Warm regards',
    complianceDisclaimer = 'This letter was sent independently and is not affiliated with any local council or government authority.',
    daAddress,
    daSuburb,
    daState,
    daPostcode,
    daDescription,
    daProjectType,
    daLodgedDate,
    daDaNumber,
    letterBodyText,
    qrCodeDataUrl,
    qrUrl,
    letterNote,
    letterDate,
  } = props

  const formattedDate = letterDate ?? new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const fullAddress = [daAddress, daSuburb, daState, daPostcode].filter(Boolean).join('\n')
  const projectLabel = PROJECT_LABEL[daProjectType] ?? 'Development Application'
  const daDateFmt = daLodgedDate
    ? new Date(daLodgedDate).toLocaleDateString('en-AU')
    : formattedDate

  const BUSINESS_LABEL: Record<string, string> = {
    renovation: 'renovation specialist',
    extension: 'extension specialist',
    granny_flat: 'granny flat specialist',
    residential: 'residential builder',
    custom: 'custom home builder',
    knockdown_rebuild: 'knockdown rebuild specialist',
  }

  // Split letter body into paragraphs; use defaults if blank
  const paragraphs = letterBodyText?.trim()
    ? letterBodyText.split('\n\n').map(p => p.trim()).filter(Boolean)
    : [
        `My name is ${companyName}. We're a local builder working in your area, and we noticed you've recently lodged a development application with council.`,
        `We'd love to reach out early — before your project goes to tender. We know the area well and can usually provide a competitive, no-obligation quote within 24 hours of hearing from you.`,
      ]

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── HEADER ── */}
        <View style={S.header}>
          {logoUrl
            ? <Image src={logoUrl} style={S.logoImg} />
            : <Text style={S.companyNameFallback}>{companyName}</Text>
          }

          {/* Neighbourhood tag */}
          <View style={S.nbhTag}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 }}>
              <PinIcon />
              <Text style={S.nbhLabel}>Your Neighbourhood</Text>
            </View>
            <Text style={S.nbhSub}>Recent Development{'\n'}Application Alert</Text>
          </View>
        </View>

        {/* ── ENVELOPE WINDOW ADDRESS ── */}
        <View style={S.addressZone}>
          <Text style={S.addressLabel}>The Property Owner</Text>
          <Text style={S.addressLine}>{fullAddress}</Text>
        </View>

        {/* ── TWO-COLUMN BODY ── */}
        <View style={S.cols}>

          {/* LEFT COLUMN */}
          <View style={S.lcol}>
            <Text style={S.greeting}>{letterGreeting},</Text>

            <Text style={S.headline}>
              {'We noticed you\'re planning\nsomething '}
              <Text style={S.headlineBlue}>exciting.</Text>
            </Text>
            <View style={S.accent} />

            <Text style={S.bodyText}>
              A Development Application has recently been lodged for your property at:
            </Text>

            {/* DA address box */}
            <View style={S.daBox}>
              <PinIcon />
              <View style={S.daBoxText}>
                <Text style={S.daBoxTitle}>{daAddress ? `${daAddress}, ${daSuburb} ${daState}` : `${daSuburb} ${daState}`}</Text>
                {daDescription ? <Text style={[S.daBoxSub, { marginBottom: 2 }]}>{daDescription}</Text> : null}
                <Text style={S.daBoxSub}>
                  DA lodged:{' '}
                  <Text style={S.daBoxSubBlue}>{daDateFmt}</Text>
                  {daDaNumber ? `  ·  Ref: ${daDaNumber}` : ''}
                </Text>
              </View>
            </View>

            {/* Body paragraphs */}
            {paragraphs.map((para, i) => (
              <Text key={i} style={S.bodyText}>{para}</Text>
            ))}

            {/* Feature rows */}
            <View style={{ marginTop: 6, marginBottom: 2 }}>
              {[
                { title: 'Licensed & insured', desc: 'Fully licensed, insured and highly rated by homeowners in your area.' },
                { title: 'No-obligation quote', desc: "We'll review your plans and give you a straight quote — no pressure." },
                { title: 'Fast response', desc: 'We reply to all enquiries the same day and can usually meet within the week.' },
              ].map(f => (
                <View key={f.title} style={S.featureRow}>
                  <View style={S.featureCircle}>
                    <CheckIcon />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.featureTitle}>{f.title}</Text>
                    <Text style={S.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Handwritten note */}
            <Text style={S.noteTitle}>A note from us</Text>
            <View style={S.noteAccent} />
            {(letterNote ?? DEFAULT_NOTE_TEXT).split('\n\n').map((para, i) => (
              <Text key={i} style={S.noteText}>{para.trim()}</Text>
            ))}
            <Text style={S.signatureName}>— {companyName}</Text>
          </View>

          {/* RIGHT COLUMN */}
          <View style={S.rcol}>

            {/* QR card */}
            <View style={S.qrCard}>
              <View style={S.qrCircle}>
                <HouseIcon />
              </View>
              <Text style={S.qrCardTitle}>Ready for your{'\n'}next step?</Text>
              <View style={S.qrCardAccent} />
              <Text style={S.qrCardSub}>
                Scan the QR code below to view our work and get in touch with us directly.
              </Text>

              {qrCodeDataUrl
                ? <Image src={qrCodeDataUrl} style={S.qrImg} />
                : (
                  <View style={[S.qrImg, { backgroundColor: LGREY, alignItems: 'center', justifyContent: 'center', borderRadius: 3 }]}>
                    <Text style={{ fontSize: 7, color: GREY }}>QR code</Text>
                  </View>
                )
              }
              <Text style={S.qrCaption}>Scan me</Text>
              {qrUrl && <Text style={[S.qrCaption, { marginTop: 3 }]}>{qrUrl}</Text>}
            </View>

            {/* Security badge */}
            <View style={S.secBadge}>
              <View style={S.secCircle}>
                <LockIcon />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.secTitle}>Your information is secure</Text>
                <Text style={S.secSub}>We respect your privacy and will never share your details.</Text>
              </View>
            </View>

            {/* Supporting homeowners */}
            <View style={S.supportNote}>
              <View style={S.supportCircle}>
                <HeartIcon />
              </View>
              <Text style={S.supportText}>Proudly supporting{'\n'}homeowners in your area.</Text>
            </View>
          </View>
        </View>

        {/* Compliance line */}
        <Text style={S.footerMeta}>{complianceDisclaimer}</Text>

        {/* ── FOOTER BAR ── */}
        <View style={S.footer}>
          <Text style={S.footerPowered}>Powered by</Text>
          <Text style={S.footerBrand}>Roweo</Text>
        </View>

      </Page>
    </Document>
  )
}
