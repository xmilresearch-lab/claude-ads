/**
 * Generates PWA icons: orange circle with white "$" centered.
 * Uses sharp (already in deps) with SVG input — no extra installs needed.
 * Run: npx ts-node scripts/generate-icons.ts
 */
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const outDir = path.join(process.cwd(), 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

async function generateIcon(size: number, filename: string): Promise<void> {
  const radius = size / 2
  const fontSize = Math.round(size * 0.45)
  const fontY = Math.round(radius + fontSize * 0.35)

  // SVG: orange filled circle + white "$" text
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${radius}" cy="${radius}" r="${radius}" fill="#EA580C"/>
  <text
    x="${radius}"
    y="${fontY}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="auto"
  >$</text>
</svg>`

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(outDir, filename))

  console.log(`✓ Generated ${filename} (${size}×${size})`)
}

async function main() {
  await generateIcon(192, 'icon-192.png')
  await generateIcon(512, 'icon-512.png')
  console.log('Icons written to public/icons/')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
