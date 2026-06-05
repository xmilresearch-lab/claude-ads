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

export default function CaseStudyEmail({ name, analysisUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>From 2 sales/month to 18 — the 8-framework plan that made the difference</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={label}>Day 3 — Real Results</Text>
          <Heading style={h1}>From 2 sales/month to 18</Heading>

          <Text style={text}>Hey{name ? ` ${name}` : ''},</Text>

          <Text style={text}>
            A $2,000 sales training course. Two or three sales a month. A founder who knew the
            product was good but couldn&apos;t figure out why it wasn&apos;t selling.
          </Text>

          <Text style={text}>
            After running the 8-framework analysis, here&apos;s what each lens revealed:
          </Text>

          <Section style={table}>
            <Section style={tableRow}>
              <Text style={expert}><strong>Hormozi:</strong></Text>
              <Text style={finding}>Offer lacked proof. No before/after. No case studies.</Text>
            </Section>
            <Section style={tableRow}>
              <Text style={expert}><strong>Gary V:</strong></Text>
              <Text style={finding}>Zero content engine. Nobody knew it existed.</Text>
            </Section>
            <Section style={tableRow}>
              <Text style={expert}><strong>Godin:</strong></Text>
              <Text style={finding}>Target was &ldquo;salespeople.&rdquo; Too broad — nobody felt it was for them.</Text>
            </Section>
            <Section style={tableRow}>
              <Text style={expert}><strong>Belfort:</strong></Text>
              <Text style={finding}>Three common objections had zero scripted responses.</Text>
            </Section>
            <Section style={tableRow}>
              <Text style={expert}><strong>Kennedy:</strong></Text>
              <Text style={finding}>Copy led with features, not the transformation.</Text>
            </Section>
          </Section>

          <Text style={text}>
            The integrated plan: narrow to B2B enterprise reps → stack 5 case studies → create
            weekly LinkedIn content → script 5 objection responses → rewrite headline with
            outcome-first copy.
          </Text>

          <Text style={text}>
            <strong>Result in 60 days: 18 sales/month. 9x improvement.</strong>
          </Text>

          <Text style={text}>
            The frameworks weren&apos;t new information. The synthesis was. When all 8 diagnose
            the same problem from different angles, you know exactly where to focus.
          </Text>

          <Button style={button} href={analysisUrl}>
            Get Your 8-Framework Diagnosis →
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
const table = { background: '#0f172a', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }
const tableRow = { marginBottom: '12px' }
const expert = { color: '#60a5fa', fontSize: '14px', margin: '0 0 2px' }
const finding = { color: '#cbd5e1', fontSize: '14px', margin: '0 0 12px', paddingLeft: '8px', borderLeft: '2px solid #1e3a5f' }
const button = {
  backgroundColor: '#2563eb', borderRadius: '8px', color: '#fff',
  fontSize: '16px', fontWeight: '600', textDecoration: 'none',
  textAlign: 'center' as const, display: 'block', padding: '14px 24px', marginBottom: '32px',
}
const hr = { borderColor: '#1e293b', margin: '24px 0' }
const footer = { color: '#475569', fontSize: '13px' }
