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

export default function FinalNudgeEmail({ name, analysisUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>One thing that will change your conversion rate this week (takes 90 seconds)</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={label}>Day 7 — One Action</Text>
          <Heading style={h1}>One thing this week that changes your conversion rate</Heading>

          <Text style={text}>Hey{name ? ` ${name}` : ''},</Text>

          <Text style={text}>
            After a week, most people have run a couple of analyses, found their biggest bottleneck,
            and — done nothing about it.
          </Text>

          <Text style={text}>
            That&apos;s not a criticism. It&apos;s just how most planning tools work. They show
            you what&apos;s wrong, then leave you to figure out the implementation.
          </Text>

          <Text style={text}>
            Here&apos;s the one action with the highest leverage across all 8 frameworks — the one
            thing that most businesses have never done and that changes conversion immediately:
          </Text>

          <Section style={highlight}>
            <Text style={highlightText}>
              <strong>Map your top 3 objections. Write one sentence response to each.</strong>
            </Text>
            <Text style={highlightSub}>
              (Belfort&apos;s Feel-Felt-Found frame: &ldquo;I understand how you feel. Others have
              felt the same. Here&apos;s what they found...&rdquo;)
            </Text>
          </Section>

          <Text style={text}>
            That&apos;s it. One sheet of paper. Three objections. Three responses. If you do this
            today, your next sales conversation will go differently.
          </Text>

          <Text style={text}>
            Run a Challenge Analysis in the app — describe your toughest sales conversation — and
            the system will map your specific objections and write the scripts for you.
          </Text>

          <Button style={button} href={analysisUrl}>
            Map My Objections Now →
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            This is the last scheduled email in your onboarding sequence. From here, you&apos;ll
            only hear from us when there&apos;s something genuinely useful to share.
          </Text>
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
const highlight = { background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px' }
const highlightText = { color: '#f1f5f9', fontSize: '17px', lineHeight: '1.5', margin: '0 0 8px' }
const highlightSub = { color: '#64748b', fontSize: '14px', fontStyle: 'italic', margin: '0' }
const button = {
  backgroundColor: '#2563eb', borderRadius: '8px', color: '#fff',
  fontSize: '16px', fontWeight: '600', textDecoration: 'none',
  textAlign: 'center' as const, display: 'block', padding: '14px 24px', marginBottom: '32px',
}
const hr = { borderColor: '#1e293b', margin: '24px 0' }
const footer = { color: '#475569', fontSize: '13px', marginBottom: '8px' }
