import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
