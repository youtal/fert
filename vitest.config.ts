import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          'src/main.ts',
          'src/router/index.ts',
          'src/**/*.d.ts',
          'src/**/__tests__/**',
        ],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 65,
          statements: 70,
        },
      },
    },
  }),
)
