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

export default function WelcomeEmail({ name, analysisUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your $100M Sales Team is ready — here&apos;s exactly what to do first</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your $100M Sales Team is ready</Heading>

          <Text style={text}>
            Hey{name ? ` ${name}` : ''} 👋
          </Text>

          <Text style={text}>
            You now have access to the same 8 frameworks used to build billion-dollar companies —
            Hormozi, GaryVee, Cardone, Belfort, Kennedy, Brunson, Godin, and Robbins — all analyzing
            your offer simultaneously and synthesizing one integrated strategy.
          </Text>

          <Text style={text}>
            <strong>Here&apos;s what to do in the next 5 minutes:</strong>
          </Text>

          <Section style={steps}>
            <Text style={step}><strong>1.</strong> Describe your offer in 2–3 sentences (what it does, who it&apos;s for, what it costs)</Text>
            <Text style={step}><strong>2.</strong> Select &ldquo;Offer Analysis&rdquo; and hit Analyze</Text>
            <Text style={step}><strong>3.</strong> Read the synthesis — then pick one immediate action and do it today</Text>
          </Section>

          <Button style={button} href={analysisUrl}>
            Run My First Analysis →
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            You get 3 free analyses. No credit card required. If you want unlimited, you can upgrade
            anytime.
          </Text>

          <Text style={footer}>
            — The $100M AI Sales Team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#030712', fontFamily: 'system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '40px 24px', maxWidth: '560px' }
const h1 = { color: '#f1f5f9', fontSize: '24px', fontWeight: '700', marginBottom: '24px' }
const text = { color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }
const steps = { background: '#0f172a', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px' }
const step = { color: '#e2e8f0', fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }
const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
  marginBottom: '32px',
}
const hr = { borderColor: '#1e293b', margin: '24px 0' }
const footer = { color: '#475569', fontSize: '14px', lineHeight: '1.5' }
