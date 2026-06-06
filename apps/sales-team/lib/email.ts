// SERVER-ONLY — never import from client components
import { Resend } from 'resend'
import { render } from '@react-email/render'
import WelcomeEmail from '@/emails/welcome'
import StoryEmail from '@/emails/story'
import ProofEmail from '@/emails/proof'
import ObjectionEmail from '@/emails/objection'
import UrgencyEmail from '@/emails/urgency'
import { SUBJECT as WELCOME_SUBJECT } from '@/emails/welcome'
import { SUBJECT as STORY_SUBJECT } from '@/emails/story'
import { SUBJECT as PROOF_SUBJECT } from '@/emails/proof'
import { SUBJECT as OBJECTION_SUBJECT } from '@/emails/objection'
import { SUBJECT as URGENCY_SUBJECT } from '@/emails/urgency'

// Lazy Resend client — instantiated on first call, not at module load
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? '')
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'team@100msalesteam.com'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

export type EmailStep = 0 | 1 | 3 | 5 | 7

interface EmailPayload {
  userId: string
  email: string
  name?: string
  analysisCount?: number
  step: EmailStep
  unsubscribeToken: string
}

export async function sendSequenceEmail(payload: EmailPayload) {
  const { email, name, analysisCount = 0, step, unsubscribeToken } = payload
  const analysisUrl = `${BASE_URL}/dashboard/analyze`
  const upgradeUrl = `${BASE_URL}/pricing`
  const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${unsubscribeToken}`

  const nameArg = name !== undefined ? { name } : {}

  let subject: string
  let html: string

  switch (step) {
    case 0:
      subject = WELCOME_SUBJECT
      html = await render(WelcomeEmail({ ...nameArg, analysisUrl, unsubscribeUrl }))
      break
    case 1:
      subject = STORY_SUBJECT
      html = await render(StoryEmail({ ...nameArg, analysisUrl, unsubscribeUrl }))
      break
    case 3:
      subject = PROOF_SUBJECT
      html = await render(ProofEmail({ ...nameArg, analysisUrl, unsubscribeUrl }))
      break
    case 5:
      subject = OBJECTION_SUBJECT
      html = await render(ObjectionEmail({ ...nameArg, upgradeUrl, unsubscribeUrl }))
      break
    case 7:
      subject = URGENCY_SUBJECT
      html = await render(UrgencyEmail({ ...nameArg, analysisUrl, upgradeUrl, analysisCount, unsubscribeUrl }))
      break
    default: {
      const exhaustive: never = step
      throw new Error(`Unknown email step: ${exhaustive as string}`)
    }
  }

  const { error } = await getResend().emails.send({ from: FROM, to: email, subject, html })
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const { error } = await getResend().emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}
