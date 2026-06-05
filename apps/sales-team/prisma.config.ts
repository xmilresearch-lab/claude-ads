import { defineConfig } from 'prisma/config'

// URL is used by Prisma CLI tools (migrate, generate)
// The runtime adapter is configured in lib/prisma.ts
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
