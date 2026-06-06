import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { getRatelimiter, TIER_LIMITS } from '@/lib/ratelimit'
import { analyzeSchema } from '@/lib/schemas'
import { writeAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { getAnthropic, MODEL } from '@/lib/ai'
import { sanitizeInput, validateOutput, AISecurityError } from '@/lib/aiSecurity'
import { checkTokenBudget, recordTokenUsage, estimateTokens } from '@/lib/tokenBudget'
import { buildHardenedAnalysisPrompt } from '@/lib/promptHardening'
import { checkAnomalySignals, isUserBlocked, recordSecurityViolation } from '@/lib/anomalyDetection'

export async function POST(req: NextRequest) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Step 1.5: Anomaly detection
  const blocked = await isUserBlocked(userId)
  if (blocked) {
    return Response.json(
      {
        error: 'temporarily_limited',
        message: 'Your account has been temporarily limited due to unusual activity. Please try again in 15 minutes.',
      },
      { status: 429 }
    )
  }
  const { flagged } = await checkAnomalySignals(userId, ipAddress)
  if (flagged) {
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Step 2: FREE tier hard cap
  if (
    session.user.tier === 'FREE' &&
    session.user.analysisCount >= TIER_LIMITS.FREE.analysesPerDay
  ) {
    return Response.json(
      {
        error: 'limit_reached',
        upgradeUrl: '/pricing',
        analysisCount: session.user.analysisCount,
      },
      { status: 402 }
    )
  }

  // Step 3: Rate limit (sliding window per tier)
  const limiter = getRatelimiter(session.user.tier)
  const { success } = await limiter.limit(`analyze:${userId}`)
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Step 4: Zod validation
  const body: unknown = await req.json()
  const parsed = analyzeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { offerText, analysisType } = parsed.data

  // Step 3.5: Token budget check (after Zod — needs parsed offerText)
  const estimated = estimateTokens(offerText)
  const budget = await checkTokenBudget(userId, session.user.tier, estimated)
  if (!budget.allowed) {
    return Response.json(
      {
        error: 'daily_token_limit_reached',
        resetAt: budget.resetAt,
        message: 'Daily analysis budget reached. Resets at midnight UTC.',
      },
      { status: 429 }
    )
  }

  // Step 4.5: Input security guard
  let sanitizedOffer: string
  try {
    const { sanitized, threats } = sanitizeInput(offerText)
    sanitizedOffer = sanitized
    if (threats.length > 0) {
      await writeAuditLog({
        userId,
        action: 'INPUT_THREAT_DETECTED',
        metadata: { threats, inputLength: offerText.length },
        ipAddress,
      })
    }
  } catch (error) {
    if (error instanceof AISecurityError) {
      void recordSecurityViolation(userId)
      await writeAuditLog({
        userId,
        action: 'SECURITY_EVENT',
        metadata: {
          threatType: error.threatType,
          inputHash: createHash('sha256').update(offerText).digest('hex'),
          inputLength: offerText.length,
        },
        ipAddress,
      })
      return Response.json(
        {
          error: 'content_policy_violation',
          message:
            'Your input could not be processed. Please describe your offer or challenge directly.',
        },
        { status: 400 }
      )
    }
    throw error
  }

  const hardenedSystemPrompt = buildHardenedAnalysisPrompt()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 5: Hardened Anthropic call using sanitized input
        const anthropicStream = getAnthropic().messages.stream({
          model: MODEL,
          max_tokens: 4000,
          system: hardenedSystemPrompt,
          stop_sequences: ['IGNORE ALL', 'ignore all', 'New instructions:', 'SYSTEM OVERRIDE'],
          messages: [
            { role: 'user', content: `${analysisType.toUpperCase()}: ${sanitizedOffer}` },
          ],
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            )
          }
        }

        const finalMessage = await anthropicStream.finalMessage()

        // Step 5.5: Record token usage — fire-and-forget
        void recordTokenUsage(
          userId,
          finalMessage.usage.input_tokens,
          finalMessage.usage.output_tokens
        )

        const rawText = finalMessage.content
          .map(b => (b.type === 'text' ? b.text : ''))
          .join('')

        // Step 6: Output security guard
        let analysisResult: Prisma.InputJsonValue
        const { valid, sanitized: sanitizedOutput, violations } = validateOutput(rawText, 'analysis')

        if (!valid) {
          // One retry with a clarifying prompt
          const retryStream = getAnthropic().messages.stream({
            model: MODEL,
            max_tokens: 4000,
            system: hardenedSystemPrompt,
            messages: [
              { role: 'user', content: `${analysisType.toUpperCase()}: ${sanitizedOffer}` },
              { role: 'assistant', content: rawText },
              {
                role: 'user',
                content:
                  'Please provide your response as valid JSON only, matching the exact schema specified. No other text.',
              },
            ],
          })
          const retryFinal = await retryStream.finalMessage()
          const retryText = retryFinal.content
            .map(b => (b.type === 'text' ? b.text : ''))
            .join('')
          const retryValidation = validateOutput(retryText, 'analysis')

          if (!retryValidation.valid) {
            await writeAuditLog({
              userId,
              action: 'OUTPUT_VALIDATION_FAILED',
              metadata: { violations },
              ipAddress,
            })
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  error: 'analysis_failed',
                  message: 'Analysis could not be completed. Please try again.',
                })}\n\n`
              )
            )
            controller.close()
            return
          }
          analysisResult = JSON.parse(retryValidation.sanitized) as Prisma.InputJsonValue
        } else {
          analysisResult = JSON.parse(sanitizedOutput) as Prisma.InputJsonValue
        }

        // Step 7: Save sanitized offer (PII stripped) to DB
        const analysis = await prisma.analysis.create({
          data: {
            userId,
            offerText: sanitizedOffer,
            analysisType,
            result: analysisResult,
            shared: true,
          },
        })

        await prisma.user.update({
          where: { id: userId },
          data: { analysisCount: { increment: 1 } },
        })

        // Step 8: Audit log
        await writeAuditLog({
          userId,
          action: 'ANALYSIS_CREATED',
          metadata: {
            analysisId: analysis.id,
            analysisType,
            offerTextLength: sanitizedOffer.length,
          },
          ipAddress,
        })

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              analysisId: analysis.id,
              shareToken: analysis.shareToken,
            })}\n\n`
          )
        )
        controller.close()
      } catch (error) {
        if (error instanceof AISecurityError) {
          void recordSecurityViolation(userId)
          await writeAuditLog({
            userId,
            action: 'SECURITY_EVENT',
            metadata: { threatType: error.threatType },
            ipAddress,
          }).catch(() => {})
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: 'content_policy_violation',
                message: 'Analysis could not be completed.',
              })}\n\n`
            )
          )
        } else {
          console.error('[analyze] stream error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Analysis failed' })}\n\n`)
          )
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
