import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { generateKeyPair, exportJWK } from 'jose';

// Locally signed Access tokens: the public half is the JWKS the Worker trusts in tests; the private half signs fixtures.
const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
const pub = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256', use: 'sig' };
const priv = { ...(await exportJWK(privateKey)), kid: 'test-key', alg: 'ES256' };

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: {
      bindings: {
        ACCESS_TEAM: 'team.example.invalid',
        ACCESS_AUD: 'test-audience',
        ADMIN_EMAILS: 'admin@example.invalid, second@example.invalid',
        ACCESS_JWKS_JSON: JSON.stringify({ keys: [pub] }),
        TEST_PRIVATE_JWK: JSON.stringify(priv)
      }
    }
  })],
  test: { include: ['test/**/*.test.js'], testTimeout: 30000 }
});
