import { z } from 'zod'

// All Zod schemas — single source of truth for API input validation

export const analyzeSchema = z.object({
  offerText: z.string().min(10, 'Offer must be at least 10 characters').max(5000, 'Offer too long').trim(),
  analysisType: z.enum(['offer', 'problem', 'challenge']),
})

export type AnalyzeInput = z.infer<typeof analyzeSchema>

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
})

export const assistantSchema = z.object({
  message: z.string().min(1, 'Message required').max(500, 'Message too long').trim(),
  conversationHistory: z.array(messageSchema).max(20).default([]),
})

export type AssistantInput = z.infer<typeof assistantSchema>

export const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID required').startsWith('price_'),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

export const analysisResultSchema = z.object({
  frameworks: z.array(z.object({
    name: z.string(),
    focus: z.string(),
    insight: z.string(),
    improvements: z.array(z.string()),
    metric: z.string(),
  })),
  synthesis: z.object({
    overview: z.string(),
    immediateActions: z.array(z.string()),
    executiveSummary: z.string(),
  }),
})

export type AnalysisResult = z.infer<typeof analysisResultSchema>
