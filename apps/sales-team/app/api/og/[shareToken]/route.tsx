import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analysisResultSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

const EXPERTS = [
  { name: 'Hormozi', color: '#4F46E5' },
  { name: 'GaryVee', color: '#9333EA' },
  { name: 'Cardone', color: '#DC2626' },
  { name: 'Belfort', color: '#D97706' },
  { name: 'Kennedy', color: '#0891B2' },
  { name: 'Brunson', color: '#059669' },
  { name: 'Godin',   color: '#DB2777' },
  { name: 'Robbins', color: '#EA580C' },
]

interface Props {
  params: Promise<{ shareToken: string }>
}

function GenericImage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#17171A',
        padding: '48px 56px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '64px', fontWeight: 900, color: '#EA580C' }}>$100M</div>
      <div style={{ fontSize: '24px', color: '#9CA3AF' }}>AI Sales Team</div>
      <div style={{ fontSize: '16px', color: '#6B7280', marginTop: '8px' }}>
        8 expert frameworks. One integrated strategy.
      </div>
    </div>
  )
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { shareToken } = await params

  const analysis = await prisma.analysis.findUnique({
    where: { shareToken },
    select: { analysisType: true, result: true },
  })

  if (!analysis) {
    return new ImageResponse(<GenericImage />, { width: 1200, height: 630 })
  }

  const parsed = analysisResultSchema.safeParse(analysis.result)
  const overview = parsed.success ? parsed.data.synthesis.overview : ''
  const typeLabel = analysis.analysisType.toUpperCase() + ' ANALYSIS'

  const image = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#17171A',
        padding: '48px 56px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header: $100M + subtitle + type chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '36px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '52px', fontWeight: 900, color: '#EA580C', lineHeight: 1 }}>
            $100M
          </div>
          <div style={{ fontSize: '20px', color: '#9CA3AF', fontWeight: 500 }}>AI Sales Team</div>
        </div>

        <div
          style={{
            background: '#431407',
            border: '1px solid #7C2D12',
            color: '#FB923C',
            fontSize: '13px',
            fontWeight: 700,
            padding: '6px 18px',
            borderRadius: '999px',
            letterSpacing: '0.08em',
            alignSelf: 'flex-start',
          }}
        >
          {typeLabel}
        </div>
      </div>

      {/* Overview — first 100 chars in white */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            color: '#F9FAFB',
            fontSize: '28px',
            fontWeight: 500,
            lineHeight: 1.5,
            maxWidth: '1000px',
            margin: 0,
          }}
        >
          {overview.slice(0, 160)}
          {overview.length > 160 ? '…' : ''}
        </p>
      </div>

      {/* Bottom: 8 colored expert dots + domain */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '28px',
          borderTop: '1px solid #27272A',
        }}
      >
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
          {EXPERTS.map(({ name, color }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: '#6B7280', fontSize: '13px', fontWeight: 500 }}>{name}</span>
            </div>
          ))}
        </div>

        <div style={{ color: '#EA580C', fontSize: '14px', fontWeight: 600, flexShrink: 0 }}>
          100msalesteam.com
        </div>
      </div>
    </div>
  )

  return new ImageResponse(image, {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}
