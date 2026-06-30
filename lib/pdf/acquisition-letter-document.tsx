import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.registerHyphenationCallback(word => [word])

const ROWEO_BLUE = '#3B6FDB'
const ROWEO_NAVY = '#1B2A4A'
const GREY_TEXT = '#6B7280'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
    paddingBottom: 60,
  },
  headerBar: {
    backgroundColor: ROWEO_BLUE,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  headerTagline: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 8,
    marginTop: 1,
  },
  body: {
    paddingHorizontal: 52,
    paddingTop: 28,
  },
  demoTag: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 6,
  },
  demoTagText: {
    fontSize: 9,
    color: '#6B4E00',
    fontFamily: 'Helvetica-Bold',
  },
  date: {
    fontSize: 10,
    color: GREY_TEXT,
    marginBottom: 16,
  },
  addressBlock: {
    marginBottom: 20,
  },
  addressLine: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#111827',
  },
  salutation: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 14,
    color: ROWEO_NAVY,
  },
  bodyPara: {
    fontSize: 10,
    lineHeight: 1.65,
    color: '#1F2937',
    marginBottom: 12,
  },
  statsBox: {
    backgroundColor: '#F0F4FF',
    borderColor: '#C7D4F7',
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: ROWEO_NAVY,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 4,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: ROWEO_BLUE,
  },
  statLabel: {
    fontSize: 8,
    color: GREY_TEXT,
    marginTop: 1,
  },
  qrSection: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  qrCode: {
    width: 80,
    height: 80,
  },
  qrText: {
    flex: 1,
    paddingTop: 4,
  },
  qrInstruction: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: ROWEO_NAVY,
    marginBottom: 6,
  },
  qrSub: {
    fontSize: 9,
    color: GREY_TEXT,
    lineHeight: 1.5,
  },
  qrUrl: {
    fontSize: 8,
    color: ROWEO_BLUE,
    marginTop: 6,
  },
  disclaimer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    marginTop: 10,
    fontSize: 7.5,
    color: '#9CA3AF',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: GREY_TEXT,
  },
})

export interface AcquisitionLetterProps {
  prospectCompanyName: string
  prospectAddress?: string | null
  prospectSuburb?: string | null
  letterBodyText: string
  qrCodeDataUrl?: string | null
  demoUrl?: string
  stats?: {
    dasThisMonth: number
    matchingSuburbs: number
    avgResponseRate: string
  }
  letterDate?: string
}

export function AcquisitionLetterDocument({ props }: { props: AcquisitionLetterProps }) {
  const date = props.letterDate ?? new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const stats = props.stats ?? { dasThisMonth: 47, matchingSuburbs: 3, avgResponseRate: '4.2%' }
  const demoUrl = props.demoUrl ?? 'roweo.com.au/demo'

  const paragraphs = props.letterBodyText
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerName}>Roweo</Text>
            <Text style={styles.headerTagline}>DA Leads for Australian Builders</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9 }}>roweo.com.au</Text>
        </View>

        <View style={styles.body}>
          {/* Demo tag */}
          <View style={styles.demoTag}>
            <Text style={styles.demoTagText}>PERSONAL DEMONSTRATION — Prepared for {props.prospectCompanyName}</Text>
          </View>

          {/* Date + address */}
          <Text style={styles.date}>{date}</Text>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLine}>{props.prospectCompanyName}</Text>
            {props.prospectAddress && <Text style={styles.addressLine}>{props.prospectAddress}</Text>}
            {props.prospectSuburb && <Text style={styles.addressLine}>{props.prospectSuburb}</Text>}
          </View>

          <Text style={styles.salutation}>Dear {props.prospectCompanyName},</Text>

          {/* Body paragraphs */}
          {paragraphs.map((para, i) => (
            <Text key={i} style={styles.bodyPara}>{para}</Text>
          ))}

          {/* Stats box */}
          <View style={styles.statsBox}>
            <Text style={styles.statsTitle}>Recent DA activity in your service area</Text>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.dasThisMonth}</Text>
                <Text style={styles.statLabel}>DAs this month</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.matchingSuburbs}</Text>
                <Text style={styles.statLabel}>Matching suburbs</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.avgResponseRate}</Text>
                <Text style={styles.statLabel}>Avg. scan rate</Text>
              </View>
            </View>
          </View>

          {/* QR section */}
          <View style={styles.qrSection}>
            {props.qrCodeDataUrl && (
              <Image style={styles.qrCode} src={props.qrCodeDataUrl} />
            )}
            <View style={styles.qrText}>
              <Text style={styles.qrInstruction}>Scan to see your personalised demo</Text>
              <Text style={styles.qrSub}>
                We've built a private demo page specifically for {props.prospectCompanyName} — showing exactly what your future homeowner letter recipients would receive, using your service suburbs and project types.
              </Text>
              <Text style={styles.qrUrl}>{demoUrl}</Text>
            </View>
          </View>

          <Text style={{ ...styles.bodyPara, fontFamily: 'Helvetica-Bold' }}>
            Roweo — roweo.com.au · hello@roweo.com.au
          </Text>

          <View style={styles.disclaimer}>
            <Text>This letter is commercial correspondence from Roweo (ABN 31 683 026 924), Sydney NSW. If you do not wish to receive further letters from us, please email hello@roweo.com.au or visit {demoUrl}.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Roweo · roweo.com.au · Sydney NSW, Australia</Text>
          <Text style={styles.footerText}>Flat subscription, no lock-in · $299/month</Text>
        </View>
      </Page>
    </Document>
  )
}
