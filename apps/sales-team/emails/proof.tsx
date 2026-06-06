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

export const SUBJECT = '3 blind spots our AI found in 500 offer analyses'

interface Props {
  name?: string
  analysisUrl: string
  unsubscribeUrl: string
}

export default function ProofEmail({ name, analysisUrl, unsubscribeUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>500 analyses. These 3 problems appeared in 80%+ of them.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>$100M Sales Team</Text>

          <Text style={text}>Hey{name ? ` ${name}` : ''} —</Text>

          <Text style={text}>
            After analyzing 500+ offers across coaching, SaaS, agencies, and e-commerce,
            the same three blind spots appear in over 80% of them.
          </Text>

          <Text style={textBold}>1. The certainty gap (Belfort)</Text>
          <Text style={text}>
            Buyers don&apos;t convert because they&apos;re not certain enough — about the product,
            about you, about themselves. Most offers only address one of the three.
          </Text>

          <Text style={textBold}>2. The mechanism is the headline (Hormozi)</Text>
          <Text style={text}>
            Founders lead with how their product works instead of what it produces.
            No one buys a mechanism. They buy a transformation.
          </Text>

          <Text style={textBold}>3. No epiphany bridge (Brunson)</Text>
          <Text style={text}>
            The offer jumps straight to the pitch without first earning the belief.
            Brunson&apos;s rule: belief must come before desire. Desire before action.
          </Text>

          <Text style={text}>
            <strong>Does your offer have any of these?</strong> Run the analysis and find out
            in 90 seconds.
          </Text>

          <Section style={btnSection}>
            <Button href={analysisUrl} style={btn}>Run the Blind Spot Analysis →</Button>
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
const logo = { fontSize: '13px', fontWeight: '700', color: '#EA580C', letterSpacing: '0.05em', textTransform: 'uppercase' as const, margin: '0 0 32px 0' }
const text = { fontSize: '16px', lineHeight: '1.7', color: '#1a1a1a', margin: '0 0 16px 0' }
const textBold = { fontSize: '16px', lineHeight: '1.7', color: '#1a1a1a', margin: '0 0 4px 0', fontWeight: '700' }
const btnSection = { margin: '24px 0' }
const btn = { backgroundColor: '#EA580C', color: '#fff', padding: '14px 28px', borderRadius: '6px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '15px', color: '#555', margin: '32px 0 0 0' }
const unsubText = { fontSize: '12px', color: '#999', margin: '32px 0 0 0', borderTop: '1px solid #e5e5e5', paddingTop: '16px' }
const unsubLink = { color: '#999' }
