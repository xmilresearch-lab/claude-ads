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

export const SUBJECT = 'What Hormozi revealed about a $2M offer (and the 1 fix that changed everything)'

interface Props {
  name?: string
  analysisUrl: string
  unsubscribeUrl: string
}

export default function StoryEmail({ name, analysisUrl, unsubscribeUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>He had a $2M offer that was barely converting. Here's what Hormozi found.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>$100M Sales Team</Text>

          <Text style={text}>Hey{name ? ` ${name}` : ''} —</Text>

          <Text style={text}>
            Last month a founder ran his $2M coaching offer through our analysis. He&apos;d been
            selling it for two years. Thought he knew it cold.
          </Text>

          <Text style={text}>
            The Hormozi framework flagged something in 90 seconds that two years of sales calls
            had never surfaced: <strong>his Dream Outcome was buried in paragraph four.</strong>
          </Text>

          <Text style={text}>
            He was leading with the mechanism — the curriculum, the calls, the community.
            Hormozi&apos;s rule: lead with the transformation. Show the dream first.
            Everything else is proof.
          </Text>

          <Text style={text}>
            He rewrote the first two sentences of his sales page. Conversion rate went up 34%
            the following week.
          </Text>

          <Text style={text}>
            One insight. Two sentences changed. 34% more revenue.
          </Text>

          <Text style={text}>
            <strong>That&apos;s what the analysis does for your offer.</strong>
          </Text>

          <Section style={btnSection}>
            <Button href={analysisUrl} style={btn}>Find My Buried Dream Outcome →</Button>
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
const btnSection = { margin: '24px 0' }
const btn = { backgroundColor: '#EA580C', color: '#fff', padding: '14px 28px', borderRadius: '6px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '15px', color: '#555', margin: '32px 0 0 0' }
const unsubText = { fontSize: '12px', color: '#999', margin: '32px 0 0 0', borderTop: '1px solid #e5e5e5', paddingTop: '16px' }
const unsubLink = { color: '#999' }
