import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

const FRAMEWORKS = [
  { name: 'Hormozi', focus: 'Value Stack', tip: 'Lead with the Dream Outcome. Mechanism is proof, not pitch. Buried outcomes kill conversions.' },
  { name: 'GaryVee', focus: 'Content & Distribution', tip: 'Your best insights are content. Share what the analysis reveals — not just the offer.' },
  { name: 'Cardone', focus: '10X Thinking', tip: "The reason you're not closing is you're thinking 1X. The market rewards the obsessed." },
  { name: 'Belfort', focus: 'Certainty & Trust', tip: 'Buyers need three certainties: about your product, about you, and about themselves.' },
  { name: 'Kennedy', focus: 'Direct Response', tip: "Every word must earn its place. Ask 'so what?' after every sentence. Cut anything that fails." },
  { name: 'Brunson', focus: 'Funnel Architecture', tip: 'Belief must come before desire. Desire before action. Rushing this kills your funnel.' },
  { name: 'Godin', focus: 'Remarkability', tip: "If your offer isn't worth talking about, it won't spread. Make it remarkable first." },
  { name: 'Robbins', focus: 'Standards & Identity', tip: "What you tolerate in your sales process, you teach. Raise the standard. Today." },
]

function getWeeklyFramework() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return FRAMEWORKS[weekNum % FRAMEWORKS.length]!
}

export function getSubject(analysisCount: number): string {
  return `Your $100M Sales Team weekly: ${analysisCount} ${analysisCount === 1 ? 'analysis' : 'analyses'}, your top insight`
}

interface Props {
  name?: string
  analysisCount: number
  topInsight: string
  analysisUrl: string
  upgradeUrl: string
  unsubscribeUrl: string
  isFreeAtLimit: boolean
}

export default function WeeklyDigestEmail({
  name,
  analysisCount,
  topInsight,
  analysisUrl,
  upgradeUrl,
  unsubscribeUrl,
  isFreeAtLimit,
}: Props) {
  const spotlight = getWeeklyFramework()

  return (
    <Html>
      <Head />
      <Preview>
        {analysisCount > 0
          ? `Your top insight this week: ${topInsight.slice(0, 80)}…`
          : 'Your weekly strategy brief from the $100M Sales Team'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>$100M Sales Team</Text>
          <Text style={heading}>Your week in review</Text>

          {/* Analyses stat */}
          <Section style={statBox}>
            <Text style={statNumber}>{analysisCount}</Text>
            <Text style={statLabel}>
              {analysisCount === 1 ? 'analysis this week' : 'analyses this week'}
            </Text>
          </Section>

          {/* Top insight */}
          {topInsight ? (
            <>
              <Text style={sectionTitle}>Your top insight</Text>
              <Section style={insightBox}>
                <Text style={insightText}>&ldquo;{topInsight}&rdquo;</Text>
              </Section>
            </>
          ) : (
            <>
              <Text style={sectionTitle}>No analyses this week</Text>
              <Text style={text}>
                Your board of 8 experts is waiting. Paste any offer and get a complete
                strategy in 90 seconds.
              </Text>
            </>
          )}

          <Hr style={hr} />

          {/* Framework spotlight */}
          <Text style={sectionTitle}>Framework spotlight: {spotlight.name}</Text>
          <Text style={spotlightFocus}>{spotlight.focus}</Text>
          <Text style={text}>{spotlight.tip}</Text>

          <Hr style={hr} />

          {/* FREE at limit: soft upgrade prompt */}
          {isFreeAtLimit && (
            <>
              <Text style={upgradeHeadline}>You&rsquo;ve used all 3 free analyses.</Text>
              <Text style={text}>
                Upgrade to Pro and run unlimited analyses — every offer, every week.
                $149/month. Cancel anytime.
              </Text>
              <Section style={btnSection}>
                <Button href={upgradeUrl} style={btnUpgrade}>Unlock Unlimited →</Button>
              </Section>
              <Hr style={hr} />
            </>
          )}

          {/* Primary CTA */}
          <Section style={btnSection}>
            <Button href={analysisUrl} style={btn}>Run This Week&rsquo;s Analysis →</Button>
          </Section>

          <Text style={footer}>— The $100M Sales Team</Text>

          <Text style={unsubText}>
            <a href={unsubscribeUrl} style={unsubLink}>Unsubscribe</a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#F7F6F3', fontFamily: 'Georgia, serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const logo = { fontSize: '13px', fontWeight: '700', color: '#EA580C', letterSpacing: '0.05em', textTransform: 'uppercase' as const, margin: '0 0 8px 0' }
const heading = { fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 24px 0' }
const statBox = { backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '20px', textAlign: 'center' as const, margin: '0 0 24px 0' }
const statNumber = { fontSize: '48px', fontWeight: '700', color: '#EA580C', margin: '0', lineHeight: '1' }
const statLabel = { fontSize: '14px', color: '#888', margin: '4px 0 0 0' }
const sectionTitle = { fontSize: '13px', fontWeight: '700', color: '#EA580C', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px 0' }
const insightBox = { backgroundColor: '#fff', borderLeft: '3px solid #EA580C', padding: '16px 20px', margin: '0 0 24px 0' }
const insightText = { fontSize: '16px', lineHeight: '1.7', color: '#1a1a1a', fontStyle: 'italic', margin: '0' }
const spotlightFocus = { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 8px 0' }
const text = { fontSize: '16px', lineHeight: '1.7', color: '#1a1a1a', margin: '0 0 16px 0' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const upgradeHeadline = { fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px 0' }
const btnSection = { margin: '24px 0' }
const btn = { backgroundColor: '#EA580C', color: '#fff', padding: '14px 28px', borderRadius: '6px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const btnUpgrade = { backgroundColor: '#1a1a1a', color: '#fff', padding: '14px 28px', borderRadius: '6px', fontSize: '15px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '15px', color: '#555', margin: '32px 0 0 0' }
const unsubText = { fontSize: '12px', color: '#999', margin: '32px 0 0 0', borderTop: '1px solid #e5e5e5', paddingTop: '16px' }
const unsubLink = { color: '#999' }
