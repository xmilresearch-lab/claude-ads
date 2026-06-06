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

export const SUBJECT = 'Your 3 free analyses expire in 48 hours (here\'s what to do)'

interface Props {
  name?: string
  analysisUrl: string
  upgradeUrl: string
  analysisCount: number
  unsubscribeUrl: string
}

export default function UrgencyEmail({ name, analysisUrl, upgradeUrl, analysisCount, unsubscribeUrl }: Props) {
  const remaining = Math.max(0, 3 - analysisCount)
  const hasRemaining = remaining > 0

  return (
    <Html>
      <Head />
      <Preview>Your free analyses are almost gone. Here's what to do right now.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>$100M Sales Team</Text>

          <Text style={text}>Hey{name ? ` ${name}` : ''} —</Text>

          <Text style={text}>
            {hasRemaining
              ? `You have ${remaining} free ${remaining === 1 ? 'analysis' : 'analyses'} left. After that, the board goes dark.`
              : "You've used all 3 free analyses. The board is dark."}
          </Text>

          <Text style={text}>
            Here&apos;s the thing about free limits: they exist so you experience the
            transformation before you pay for it. Not to frustrate you. The transformation
            should speak for itself.
          </Text>

          <Text style={text}>
            If the analysis showed you something real — if it named a problem you already
            knew but hadn&apos;t articulated, or surfaced something you missed — then you
            already know the answer here.
          </Text>

          {hasRemaining && (
            <Text style={text}>
              <strong>Use your {remaining === 1 ? 'last analysis' : `last ${remaining} analyses`} on your most important offer.</strong>
            </Text>
          )}

          <Text style={text}>
            Or upgrade now and never think about limits again.
          </Text>

          <Section style={btnSection}>
            {hasRemaining && (
              <Button href={analysisUrl} style={btnSecondary}>Use My Free Analyses →</Button>
            )}
            <Button href={upgradeUrl} style={btn}>Unlock Unlimited Strategies — $49/mo →</Button>
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
const btnSection = { margin: '24px 0', display: 'flex', flexDirection: 'column' as const, gap: '12px' }
const btn = { backgroundColor: '#EA580C', color: '#fff', padding: '14px 28px', borderRadius: '6px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }
const btnSecondary = { backgroundColor: 'transparent', color: '#EA580C', padding: '12px 28px', borderRadius: '6px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block', border: '2px solid #EA580C', marginBottom: '8px' }
const footer = { fontSize: '15px', color: '#555', margin: '32px 0 0 0' }
const unsubText = { fontSize: '12px', color: '#999', margin: '32px 0 0 0', borderTop: '1px solid #e5e5e5', paddingTop: '16px' }
const unsubLink = { color: '#999' }
