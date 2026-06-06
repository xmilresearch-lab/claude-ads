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

export const SUBJECT = 'You already have a consultant (I know)'

interface Props {
  name?: string
  upgradeUrl: string
  unsubscribeUrl: string
}

export default function ObjectionEmail({ name, upgradeUrl, unsubscribeUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>You have a business advisor. Here's what they can't do that this can.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>$100M Sales Team</Text>

          <Text style={text}>Hey{name ? ` ${name}` : ''} —</Text>

          <Text style={text}>
            I know what you&apos;re thinking. You have a coach. An advisor. Maybe a business
            partner who&apos;s seen some things. Why do you need this?
          </Text>

          <Text style={text}>
            <strong>Here&apos;s what your advisor can&apos;t do:</strong>
          </Text>

          <Text style={text}>
            They can&apos;t apply Hormozi&apos;s value equation, Belfort&apos;s certainty stack,
            Kennedy&apos;s direct response rules, Brunson&apos;s epiphany bridge, and four more
            frameworks simultaneously — in 90 seconds — to your exact offer, in your exact words.
          </Text>

          <Text style={text}>
            They give you one perspective filtered through their experience.
            This gives you eight perspectives synthesized into one strategy.
          </Text>

          <Text style={text}>
            Your advisor costs $500/hour. This costs $49/month. And it never tells you
            what you want to hear — only what the frameworks say.
          </Text>

          <Text style={text}>
            <strong>That&apos;s the edge.</strong>
          </Text>

          <Section style={btnSection}>
            <Button href={upgradeUrl} style={btn}>Unlock Unlimited Strategies →</Button>
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
