import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.registerHyphenationCallback(word => [word])

const NAVY = '#1B2A4A'
const GREY = '#6B7280'
const GREY_LIGHT = '#F3F4F6'
const BORDER = '#E5E7EB'

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

  letterDate?: string
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  // ── TOP SECTION: sender block (0–95pt) ──────────────────────────────
  // Sits in the top third. When folded for a DL window envelope
  // (fold at ~99mm from top, then ~198mm), this is hidden behind the flap.
  top: {
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 0,
  },
  senderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  logo: {
    width: 100,
    height: 36,
    objectFit: 'contain',
    objectPositionX: 'left',
  },
  logoPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  senderDetails: {
    textAlign: 'right',
  },
  senderName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    marginBottom: 2,
  },
  senderContact: {
    fontSize: 8,
    color: GREY,
    lineHeight: 1.5,
  },
  dateLine: {
    marginTop: 16,
    fontSize: 9,
    color: GREY,
    textAlign: 'right',
  },
  dividerLight: {
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    marginTop: 20,
    marginBottom: 0,
  },

  // ── MIDDLE SECTION: recipient address block (~99–197pt from top) ─────
  // This is the section visible through the DL window envelope.
  // Address starts at ~107mm from top of page (~303pt), ~20mm from left (~57pt).
  // Standard DL window: 20mm from left, 55–100mm from top of envelope (middle fold).
  addressZone: {
    paddingLeft: 48,
    paddingRight: 48,
    paddingTop: 24,  // sits within the middle fold zone
    paddingBottom: 12,
    minHeight: 80,
  },
  addressLabel: {
    fontSize: 7.5,
    color: GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  addressLine: {
    fontSize: 10.5,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.5,
  },

  // ── RE LINE ──────────────────────────────────────────────────────────
  reSection: {
    paddingHorizontal: 48,
    marginBottom: 0,
  },
  reLine: {
    borderLeftWidth: 2,
    borderLeftColor: NAVY,
    paddingLeft: 10,
    paddingVertical: 5,
    marginBottom: 16,
  },
  reText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    lineHeight: 1.4,
  },
  reDetail: {
    fontSize: 8,
    color: GREY,
    marginTop: 2,
  },

  // ── BODY ─────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 48,
  },
  greeting: {
    fontSize: 10,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374151',
    marginBottom: 11,
  },

  // ── SIGN OFF ──────────────────────────────────────────────────────────
  signOff: {
    marginTop: 16,
    marginBottom: 3,
    fontSize: 10,
  },
  signOffName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: NAVY,
    marginTop: 2,
  },
  signOffContact: {
    fontSize: 8.5,
    color: GREY,
    lineHeight: 1.6,
    marginTop: 4,
  },

  // ── QR CODE BLOCK ─────────────────────────────────────────────────────
  // Clean, boxed QR section — no colored backgrounds, just a border
  qrBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderWidth: 0.75,
    borderColor: BORDER,
    borderRadius: 3,
  },
  qrImage: {
    width: 64,
    height: 64,
    marginRight: 14,
  },
  qrTextBlock: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    marginBottom: 4,
  },
  qrInstruction: {
    fontSize: 8,
    color: GREY,
    lineHeight: 1.55,
  },
  qrUrl: {
    fontSize: 7.5,
    color: GREY,
    marginTop: 4,
  },

  // ── FOOTER ────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 48,
    right: 48,
  },
  footerDivider: {
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    marginBottom: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: '#9CA3AF',
    lineHeight: 1.5,
  },
})

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
    letterGreeting = 'Dear Homeowner',
    letterSignOff = 'Kind regards',
    complianceDisclaimer = 'This letter was sent independently by the builder named above and is not affiliated with any local council or government authority.',
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
    letterDate,
  } = props

  const formattedDate = letterDate ?? new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const fullAddress = [daAddress, daSuburb, daState, daPostcode].filter(Boolean).join('\n')
  const projectLabel = PROJECT_LABEL[daProjectType] ?? 'Development Application'
  const senderContacts = [phone, website, licenseNumber ? `Lic. ${licenseNumber}` : null].filter(Boolean).join('\n')

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── TOP THIRD: Sender info ───────────────────────────────────── */}
        <View style={styles.top}>
          <View style={styles.senderRow}>
            {/* Logo (or company name if no logo) */}
            {logoUrl
              ? <Image src={logoUrl} style={styles.logo} />
              : <Text style={styles.logoPlaceholderText}>{companyName}</Text>
            }

            {/* Sender contact block, right-aligned */}
            <View style={styles.senderDetails}>
              {logoUrl && <Text style={styles.senderName}>{companyName}</Text>}
              {tagline && <Text style={styles.senderContact}>{tagline}</Text>}
              <Text style={styles.senderContact}>{senderContacts}</Text>
              <Text style={styles.dateLine}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.dividerLight} />
        </View>

        {/* ── MIDDLE THIRD: Recipient address (shows through window envelope) */}
        <View style={styles.addressZone}>
          <Text style={styles.addressLabel}>The Property Owner</Text>
          <Text style={styles.addressLine}>{fullAddress}</Text>
        </View>

        {/* ── RE line ─────────────────────────────────────────────────── */}
        <View style={styles.reSection}>
          <View style={styles.reLine}>
            <Text style={styles.reText}>
              RE: {projectLabel} — {daAddress}, {daSuburb}
            </Text>
            {(daDaNumber || daLodgedDate) && (
              <Text style={styles.reDetail}>
                {[
                  daDaNumber ? `DA No. ${daDaNumber}` : null,
                  daLodgedDate
                    ? `Lodged ${new Date(daLodgedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
        </View>

        {/* ── Letter body ─────────────────────────────────────────────── */}
        <View style={styles.body}>
          <Text style={styles.greeting}>{letterGreeting},</Text>

          {letterBodyText.split('\n\n').map((para, i) => (
            <Text key={i} style={styles.paragraph}>{para.trim()}</Text>
          ))}

          {/* Sign off */}
          <Text style={styles.signOff}>{letterSignOff},</Text>
          <Text style={styles.signOffName}>{companyName}</Text>
          {senderContacts.length > 0 && (
            <Text style={styles.signOffContact}>{senderContacts}</Text>
          )}

          {/* QR code — clean bordered box, no background fill */}
          {qrCodeDataUrl && (
            <View style={styles.qrBlock}>
              <Image src={qrCodeDataUrl} style={styles.qrImage} />
              <View style={styles.qrTextBlock}>
                <Text style={styles.qrTitle}>Scan to view our profile &amp; request a quote</Text>
                <Text style={styles.qrInstruction}>
                  Point your phone camera at this QR code to visit our profile page,
                  view our previous work, and submit a free quote request in under 2 minutes.
                </Text>
                {qrUrl && <Text style={styles.qrUrl}>{qrUrl}</Text>}
              </View>
            </View>
          )}
        </View>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>
            {complianceDisclaimer}
            {licenseNumber ? `  ·  ABN 31 683 026 924  ·  Lic. ${licenseNumber}` : '  ·  ABN 31 683 026 924'}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
