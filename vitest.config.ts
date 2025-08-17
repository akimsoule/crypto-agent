import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['test/**/*.spec.ts', 'netlify/test/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
