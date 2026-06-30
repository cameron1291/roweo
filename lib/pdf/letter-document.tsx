import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

// Register Helvetica — always available in PDF spec, no download needed
Font.registerHyphenationCallback(word => [word])

const NAVY = '#1B2A4A'
const GREY_TEXT = '#6B7280'
const GREY_LIGHT = '#F3F4F6'
const BORDER = '#E5E7EB'

export interface LetterProps {
  // Builder
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

  // DA / Homeowner
  daAddress: string
  daSuburb: string
  daState: string
  daPostcode?: string | null
  daDescription: string
  daProjectType: string
  daLodgedDate?: string | null
  daDaNumber?: string | null

  // Letter content
  letterBodyText: string

  // QR
  qrCodeDataUrl?: string | null
  qrUrl?: string

  // Date
  letterDate?: string
}

function makeStyles(brandColor: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#111827',
      paddingBottom: 60,
    },
    // Header bar
    headerBar: {
      backgroundColor: brandColor,
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 36,
    },
    headerLogo: {
      width: 80,
      height: 28,
      objectFit: 'contain',
    },
    headerCompanyName: {
      color: '#FFFFFF',
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
    },
    headerTagline: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 8,
      marginTop: 2,
    },
    // Body
    body: {
      paddingHorizontal: 52,
      paddingTop: 28,
    },
    // Date + ref line
    dateRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 20,
    },
    dateText: {
      color: GREY_TEXT,
      fontSize: 9,
    },
    // Property address
    addressBlock: {
      marginBottom: 18,
    },
    addressLabel: {
      color: GREY_TEXT,
      fontSize: 8,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    addressText: {
      fontSize: 10,
      color: NAVY,
      fontFamily: 'Helvetica-Bold',
      lineHeight: 1.4,
    },
    // RE line
    reLine: {
      backgroundColor: GREY_LIGHT,
      borderLeftWidth: 3,
      borderLeftColor: brandColor,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 20,
      borderRadius: 2,
    },
    reText: {
      color: NAVY,
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
    },
    reDetail: {
      color: GREY_TEXT,
      fontSize: 8,
      marginTop: 2,
    },
    // Letter body
    greeting: {
      fontSize: 10,
      marginBottom: 12,
    },
    paragraph: {
      fontSize: 10,
      lineHeight: 1.55,
      color: '#374151',
      marginBottom: 12,
    },
    // CTA box
    ctaBox: {
      borderWidth: 1,
      borderColor: brandColor,
      backgroundColor: '#F0F4FF',
      borderRadius: 4,
      padding: 14,
      marginTop: 8,
      marginBottom: 16,
    },
    ctaTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: NAVY,
      marginBottom: 4,
    },
    ctaText: {
      fontSize: 9,
      color: '#374151',
      lineHeight: 1.5,
    },
    // Sign off
    signOff: {
      marginTop: 20,
      marginBottom: 4,
      fontSize: 10,
    },
    signOffName: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 11,
      color: NAVY,
      marginTop: 2,
    },
    signOffDetails: {
      fontSize: 9,
      color: GREY_TEXT,
      lineHeight: 1.6,
      marginTop: 4,
    },
    // QR section
    qrRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: BORDER,
    },
    qrCode: {
      width: 72,
      height: 72,
    },
    qrText: {
      marginLeft: 14,
      flex: 1,
    },
    qrTitle: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: NAVY,
      marginBottom: 3,
    },
    qrInstruction: {
      fontSize: 8,
      color: GREY_TEXT,
      lineHeight: 1.5,
    },
    // Footer
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 52,
      right: 52,
    },
    footerDivider: {
      borderTopWidth: 1,
      borderTopColor: BORDER,
      marginBottom: 8,
    },
    footerText: {
      fontSize: 7,
      color: '#9CA3AF',
      lineHeight: 1.5,
    },
  })
}

export function LetterDocument(props: LetterProps) {
  const {
    companyName,
    logoUrl,
    brandColor = '#3B6FDB',
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
    letterDate,
  } = props

  const styles = makeStyles(brandColor)

  const formattedDate = letterDate ?? new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const fullAddress = [daAddress, daSuburb, daState, daPostcode].filter(Boolean).join(' ')

  const projectLabel: Record<string, string> = {
    new_dwelling: 'New Dwelling',
    extension: 'Extension / Addition',
    renovation: 'Renovation',
    pool: 'Pool',
    demolition: 'Demolition',
    commercial: 'Commercial',
    other: 'Development Application',
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerCompanyName}>{companyName}</Text>
            {tagline && <Text style={styles.headerTagline}>{tagline}</Text>}
          </View>
          {logoUrl && (
            <Image src={logoUrl} style={styles.headerLogo} />
          )}
        </View>

        <View style={styles.body}>
          {/* Date */}
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          {/* Property address */}
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>The Property Owner</Text>
            <Text style={styles.addressText}>{fullAddress}</Text>
          </View>

          {/* RE line */}
          <View style={styles.reLine}>
            <Text style={styles.reText}>
              RE: {projectLabel[daProjectType] ?? 'Development Application'} at {daAddress}, {daSuburb}
            </Text>
            <Text style={styles.reDetail}>
              {daDaNumber ? `DA No. ${daDaNumber} · ` : ''}
              {daLodgedDate
                ? `Lodged ${new Date(daLodgedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : `Description: ${daDescription?.slice(0, 120) ?? ''}`}
            </Text>
          </View>

          {/* Greeting + body */}
          <Text style={styles.greeting}>{letterGreeting},</Text>

          {letterBodyText.split('\n\n').map((para, i) => (
            <Text key={i} style={styles.paragraph}>{para.trim()}</Text>
          ))}

          {/* CTA box */}
          <View style={styles.ctaBox}>
            <Text style={styles.ctaTitle}>Request a free, no-obligation quote</Text>
            <Text style={styles.ctaText}>
              Scan the QR code below to view our profile, request a quote, or book a time to discuss your project.
              {phone ? `  Or call us directly: ${phone}` : ''}
            </Text>
          </View>

          {/* Sign off */}
          <Text style={styles.signOff}>{letterSignOff},</Text>
          <Text style={styles.signOffName}>{companyName}</Text>
          <Text style={styles.signOffDetails}>
            {[phone, website, licenseNumber ? `Lic. ${licenseNumber}` : null]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>

          {/* QR code */}
          {qrCodeDataUrl && (
            <View style={styles.qrRow}>
              <Image src={qrCodeDataUrl} style={styles.qrCode} />
              <View style={styles.qrText}>
                <Text style={styles.qrTitle}>Scan to view our profile & request a quote</Text>
                <Text style={styles.qrInstruction}>
                  Use your phone camera or a QR code reader to visit our profile page,
                  view our work, and submit a quote request — all online in under 2 minutes.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>{complianceDisclaimer}</Text>
        </View>
      </Page>
    </Document>
  )
}
