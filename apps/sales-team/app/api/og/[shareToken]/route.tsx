import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analysisResultSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

interface Props {
  params: Promise<{ shareToken: string }>
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { shareToken } = await params

  const analysis = await prisma.analysis.findUnique({
    where: { shareToken },
    select: { offerText: true, analysisType: true, result: true },
  })

  if (!analysis) {
    return new Response('Not found', { status: 404 })
  }

  const parsed = analysisResultSchema.safeParse(analysis.result)
  const overview = parsed.success ? parsed.data.synthesis.overview : ''
  const immediateActions = parsed.success ? parsed.data.synthesis.immediateActions.slice(0, 3) : []

  const offerPreview =
    analysis.offerText.length > 120
      ? analysis.offerText.slice(0, 117) + '...'
      : analysis.offerText

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #030712 0%, #0f172a 50%, #1e1b4b 100%)',
          padding: '48px 56px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              background: '#2563eb',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>$</div>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '16px', fontWeight: '500' }}>
            $100M AI Sales Team
          </div>
          <div
            style={{
              marginLeft: 'auto',
              background: '#1e3a5f',
              color: '#60a5fa',
              fontSize: '13px',
              fontWeight: '600',
              padding: '4px 12px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {analysis.analysisType} Analysis
          </div>
        </div>

        {/* Offer text */}
        <div
          style={{
            color: '#f1f5f9',
            fontSize: '22px',
            fontWeight: '600',
            lineHeight: '1.45',
            marginBottom: '28px',
            maxWidth: '820px',
          }}
        >
          &ldquo;{offerPreview}&rdquo;
        </div>

        {/* Overview */}
        {overview && (
          <div
            style={{
              color: '#94a3b8',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '32px',
              maxWidth: '860px',
            }}
          >
            {overview.length > 200 ? overview.slice(0, 197) + '...' : overview}
          </div>
        )}

        {/* Immediate actions */}
        {immediateActions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '40px' }}>
            {immediateActions.map((action, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    background: '#2563eb',
                    borderRadius: '50%',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.5' }}>
                  {action.length > 120 ? action.slice(0, 117) + '...' : action}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Hormozi', 'GaryVee', 'Cardone', 'Belfort', 'Kennedy', 'Brunson', 'Godin', 'Robbins'].map(
              (name) => (
                <div
                  key={name}
                  style={{
                    background: '#1e293b',
                    color: '#64748b',
                    fontSize: '12px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                  }}
                >
                  {name}
                </div>
              )
            )}
          </div>
          <div style={{ color: '#475569', fontSize: '13px' }}>8 frameworks · 1 strategy</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
