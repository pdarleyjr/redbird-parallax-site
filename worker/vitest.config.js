import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: {
      bindings: {
        ADMIN_PASSWORD: 'correct horse battery staple (test only)',
        SESSION_SECRET: 'test-session-secret-0123456789abcdef0123456789abcdef'
      }
    }
  })],
  test: { include: ['test/**/*.test.js'], testTimeout: 30000 }
});
