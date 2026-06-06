/**
 * GET /api/unsubscribe?token=<unsubscribeToken>
 * No auth required — one-click unsubscribe from email sequences.
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest): Promise<Response> {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return new Response(errorHtml('Missing unsubscribe token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const user = await prisma.user.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, marketingOptOut: true },
  })

  if (!user) {
    return new Response(errorHtml('Invalid unsubscribe link.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!user.marketingOptOut) {
    await prisma.user.update({
      where: { id: user.id },
      data: { marketingOptOut: true },
    })
  }

  return new Response(successHtml(), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

function successHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed — $100M Sales Team</title>
  <style>
    body { font-family: Georgia, serif; background: #F7F6F3; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { max-width: 480px; padding: 48px 32px; text-align: center; }
    .brand { font-size: 13px; font-weight: 700; color: #EA580C; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 32px; }
    h1 { font-size: 24px; color: #1a1a1a; margin: 0 0 16px 0; }
    p { font-size: 16px; line-height: 1.7; color: #555; margin: 0 0 24px 0; }
    a { color: #EA580C; }
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">$100M Sales Team</p>
    <h1>You&rsquo;ve been unsubscribed.</h1>
    <p>You won&rsquo;t receive any more marketing emails from us.</p>
    <p>Your account and analyses are still intact. <a href="/">Return to the app →</a></p>
  </div>
</body>
</html>`
}

function errorHtml(message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Error — $100M Sales Team</title>
  <style>
    body { font-family: Georgia, serif; background: #F7F6F3; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { max-width: 480px; padding: 48px 32px; text-align: center; }
    .brand { font-size: 13px; font-weight: 700; color: #EA580C; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 32px; }
    h1 { font-size: 24px; color: #1a1a1a; margin: 0 0 16px 0; }
    p { font-size: 16px; line-height: 1.7; color: #555; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">$100M Sales Team</p>
    <h1>Something went wrong.</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
}
