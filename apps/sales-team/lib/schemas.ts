import { z } from 'zod'

export const analyzeSchema = z.object({
  offerText: z
    .string()
    .min(10, 'Describe your offer in at least 10 characters')
    .max(5000, 'Maximum 5000 characters')
    .trim(),
  analysisType: z.enum(['offer', 'problem', 'challenge']),
})

export type AnalyzeInput = z.infer<typeof analyzeSchema>

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
})

export const assistantSchema = z.object({
  message: z.string().min(1).max(500).trim(),
  conversationHistory: z.array(messageSchema).max(20).default([]),
})

export type AssistantInput = z.infer<typeof assistantSchema>

export const shareTokenSchema = z.object({
  shareToken: z.string().cuid(),
})

export const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID required').startsWith('price_'),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

export const analysisResultSchema = z.object({
  frameworks: z.array(
    z.object({
      name: z.string(),
      focus: z.string(),
      insight: z.string(),
      improvements: z.array(z.string()),
      metric: z.string(),
    })
  ),
  synthesis: z.object({
    overview: z.string(),
    immediateActions: z.array(z.string()),
    executiveSummary: z.string(),
  }),
})

export type AnalysisResult = z.infer<typeof analysisResultSchema>
