import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines:      70,
        functions:  70,
        branches:   60,
        statements: 70,
      },
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        'src/app/**',
        '**/*.d.ts',
        '**/types.ts',
        'src/lib/env.ts',
        'vitest.config.ts',
        'next.config.ts',
        'tailwind.config.ts',
        'postcss.config.js',
        // API layer — requires network/server integration tests
        'src/lib/api/**',
        'src/hooks/**',
        // Auth tokens — requires cookie/fetch mocking at integration level
        'src/lib/auth/**',
        // React providers — require full React tree
        'src/lib/providers/**',
        // Complex hooks requiring React Query context
        'src/lib/hooks/**',
        // Components — covered by component tests in __tests__; exclude heavy UI
        'src/components/analytics/**',
        'src/components/auth/**',
        'src/components/automations/AutomationFormModal.tsx',
        'src/components/automations/RunDetailModal.tsx',
        'src/components/automations/automation-card.tsx',
        'src/components/automations/create-automation-dialog.tsx',
        'src/components/content/ReviewModal.tsx',
        'src/components/content/RejectModal.tsx',
        'src/components/layout/sidebar.tsx',
        'src/components/layout/topbar.tsx',
        'src/components/layout/onboarding-banner.tsx',
        'src/components/layout/admin-sidebar.tsx',
        'src/components/ui/dropdown-menu.tsx',
        'src/components/ui/dialog.tsx',
        'src/components/ui/progress.tsx',
        'src/components/ui/separator.tsx',
        'src/components/ui/tabs.tsx',
        'src/components/ui/avatar.tsx',
        'src/components/ui/card.tsx',
        'src/components/ui/label.tsx',
        'src/components/ui/skeleton.tsx',
        'src/components/shared/data-table.tsx',
        'src/components/shared/loading-skeleton.tsx',
      ],
      include: [
        'src/lib/**',
        'src/hooks/**',
        'src/components/**',
      ],
    },
    onConsoleLog(log) {
      if (log.includes('ResizeObserver') || log.includes('Warning: ReactDOM.render')) {
        return false
      }
    },
  },
})
