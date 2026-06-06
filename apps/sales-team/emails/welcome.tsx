import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const SUBJECT = 'Your AI board of 8 experts is ready'

interface Props {
  name?: string
  analysisUrl: string
  unsubscribeUrl: string
}

export default function WelcomeEmail({ name, analysisUrl, unsubscribeUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Paste your offer. Get a complete strategy in 90 seconds.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>$100M Sales Team</Text>

          <Text style={text}>
            Hey{name ? ` ${name}` : ''} —
          </Text>

          <Text style={text}>
            In the next 90 seconds, 8 of the world&apos;s sharpest sales minds will read your
            offer and tell you exactly what&apos;s killing your conversions — and what to do about it.
          </Text>

          <Text style={text}>
            Hormozi on your value stack. Belfort on your certainty signals. Kennedy on your copy.
            All eight. One integrated strategy. Instantly.
          </Text>

          <Text style={text}>
            <strong>Start your first analysis now:</strong>
          </Text>

          <Section style={btnSection}>
            <Button href={analysisUrl} style={btn}>Analyze My Offer →</Button>
          </Section>

          <Text style={text}>
            You have 3 free analyses. Use them on your most important offer first.
          </Text>

          <Text style={footer}>
            — The $100M Sales Team
          </Text>

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
const logo = { fontSize: '13px', fontWeight: '700', color: '#EA580C', letterSpacing: '0.05em', textTransform: 'uppercase' as const, margin: '0 0 32px 0' }
const text = { fontSize: '16px', lineHeight: '1.7', color: '#1a1a1a', margin: '0 0 16px 0' }
const btnSection = { margin: '24px 0' }
const btn = { backgroundColor: '#EA580C', color: '#fff', padding: '14px 28px', borderRadius: '6px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '15px', color: '#555', margin: '32px 0 0 0' }
const unsubText = { fontSize: '12px', color: '#999', margin: '32px 0 0 0', borderTop: '1px solid #e5e5e5', paddingTop: '16px' }
const unsubLink = { color: '#999' }
