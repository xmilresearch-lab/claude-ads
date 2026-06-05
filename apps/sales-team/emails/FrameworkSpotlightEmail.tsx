import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface Props {
  name?: string
  analysisUrl: string
}

export default function FrameworkSpotlightEmail({ name, analysisUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Why your offer is losing deals — and the Hormozi diagnosis that fixes it</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={label}>Day 1 — Framework Spotlight</Text>
          <Heading style={h1}>Why your offer is losing deals</Heading>

          <Text style={text}>
            Hey{name ? ` ${name}` : ''},
          </Text>

          <Text style={text}>
            Most offers fail for one of three reasons. Alex Hormozi calls it the Value Equation:
          </Text>

          <Section style={formula}>
            <Text style={formulaText}>
              Value = (Dream Outcome × Perceived Likelihood of Success) ÷ (Time Delay × Effort)
            </Text>
          </Section>

          <Text style={text}>
            Your offer loses deals when <em>any one</em> of these breaks down:
          </Text>

          <Section style={list}>
            <Text style={listItem}>📉 <strong>Dream outcome is fuzzy.</strong> Buyers can&apos;t see themselves succeeding.</Text>
            <Text style={listItem}>📉 <strong>Perceived likelihood is low.</strong> No proof. No case studies. No before/after.</Text>
            <Text style={listItem}>📉 <strong>Time delay feels long.</strong> They don&apos;t believe they&apos;ll see results fast enough.</Text>
            <Text style={listItem}>📉 <strong>Effort feels high.</strong> Your offer seems hard to implement.</Text>
          </Section>

          <Text style={text}>
            <strong>The fix is specific:</strong> Stack proof (testimonials, before/afters, case studies),
            shrink the perceived timeline (&ldquo;results in 30 days&rdquo;), and make the first step obvious.
          </Text>

          <Text style={text}>
            Run an Offer Analysis and the system will score your Value Equation and tell you exactly
            where you&apos;re losing people.
          </Text>

          <Button style={button} href={analysisUrl}>
            Score My Offer Now →
          </Button>

          <Hr style={hr} />
          <Text style={footer}>$100M AI Sales Team · Unsubscribe</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#030712', fontFamily: 'system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '40px 24px', maxWidth: '560px' }
const label = { color: '#2563eb', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }
const h1 = { color: '#f1f5f9', fontSize: '24px', fontWeight: '700', marginBottom: '24px' }
const text = { color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }
const formula = { background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }
const formulaText = { color: '#60a5fa', fontSize: '15px', fontStyle: 'italic', margin: '0' }
const list = { marginBottom: '24px' }
const listItem = { color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', marginBottom: '10px' }
const button = {
  backgroundColor: '#2563eb', borderRadius: '8px', color: '#fff',
  fontSize: '16px', fontWeight: '600', textDecoration: 'none',
  textAlign: 'center' as const, display: 'block', padding: '14px 24px', marginBottom: '32px',
}
const hr = { borderColor: '#1e293b', margin: '24px 0' }
const footer = { color: '#475569', fontSize: '13px' }
