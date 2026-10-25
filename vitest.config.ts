import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Define separate test projects for server and client environments
    workspace: [
      {
        // Server tests: Node.js environment
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.ts', 'server/**/*.spec.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          coverage: {
            enabled: true,
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: './coverage/server',
            include: ['server/**/*.ts'],
            exclude: [
              'server/**/*.test.ts',
              'server/**/*.spec.ts',
              'server/tests/**',
              'server/data/seed.ts',
              'server/data/templates.ts',
            ],
            thresholds: {
              lines: 75,
              functions: 75,
              branches: 70,
              statements: 75,
              // Specific thresholds per directory
              'server/logic/**': {
                lines: 85,
                functions: 85,
                branches: 80,
                statements: 85,
              },
              'server/middleware/**': {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
              },
              'server/repositories/**': {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
              },
              'server/ai/**': {
                lines: 70,
                functions: 70,
                branches: 65,
                statements: 70,
              },
              'server/services/**': {
                lines: 70,
                functions: 70,
                branches: 65,
                statements: 70,
              },
            },
          },
        },
      },
      {
        // Client tests: jsdom environment with React
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          setupFiles: ['./src/test/setup.ts'],
          coverage: {
            enabled: true,
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: './coverage/client',
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
              'src/**/*.test.{ts,tsx}',
              'src/**/*.spec.{ts,tsx}',
              'src/test/**',
              'src/main.tsx',
              'src/**/*.d.ts',
            ],
            thresholds: {
              lines: 70,
              functions: 70,
              branches: 65,
              statements: 70,
            },
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
