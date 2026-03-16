import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    environmentOptions: {
      jsdom: {
        url: 'https://www.youtube.com/'
      }
    }
  },
  resolve: {
    alias: {
      '@content': path.resolve(__dirname, 'src/content'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  }
});
