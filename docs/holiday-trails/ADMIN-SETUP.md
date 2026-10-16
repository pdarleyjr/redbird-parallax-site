# Admin setup (Cloudflare Workers + D1 + Access)

Provisioned 2026-10-16. Record and recovery guide. Auth history: DECISIONS-LOG D12 (a password design was built and then reversed in favour of Access).

| Piece | Name / value |
|---|---|
| Cloudflare account | `265122b6d6f29457b0ca950c55f3ac6e` (shared with unrelated MBFD projects; this project only touches `redbird-*`) |
| D1 database | `redbird-trails` (`bd3d16ad-1545-466c-853f-a1ade401eed2`) |
| Public Worker (read-only) | `redbird-public` → https://redbird-public.pdarleyjr.workers.dev |
| Admin Worker | `redbird-admin` → https://redbird-admin.pdarleyjr.workers.dev |
| Access team | `darl.cloudflareaccess.com` |
| Access application | "Red Bird Trails Admin" (`641543b6-83c8-43e5-a363-823b395c4169`), host `redbird-admin.pdarleyjr.workers.dev`, 24 h sessions, policy "Red Bird admins" (allow) with the two owner email addresses, one-time PIN login |
| Worker vars | `ACCESS_TEAM`, `ACCESS_AUD` (in `worker/wrangler.jsonc`, not secret) |
| Worker secret | `ADMIN_EMAILS` (comma-separated allowlist; never committed) |

## Two layers, both fail closed
1. Cloudflare Access sits in front of the whole admin host (email one-time PIN). A request without an Access session is redirected to the Access login.
2. Every `/api/*` request verifies the `Cf-Access-Jwt-Assertion` (signature via the team JWKS, issuer, audience) **and** checks the email against `ADMIN_EMAILS`. Missing or invalid configuration answers 503, a missing or bad token 401, a valid token for an address not on the list 403. Mutations also need a same-origin `Origin` header and a JSON content type. The audit log records the verified email, a truncated user agent and a hashed address.

## Using it
Open https://redbird-admin.pdarleyjr.workers.dev, enter an allowed email, then the 6-digit code Cloudflare emails you. Sections: **Houses**, **Import** (the CSV is read in your browser; only date, address and house name are uploaded), **Versions**, **Events**, **Activity**. **Sign out** ends the Access session. A published change reaches the public site within about 30 seconds as one new snapshot version.

## Add or remove an admin (do both places)
```bash
cd worker
npx wrangler secret put ADMIN_EMAILS --env admin      # comma-separated, e.g. one@example.com,two@example.com
```
Then add or remove the address in Zero Trust → Access → Applications → Red Bird Trails Admin → Policies → "Red Bird admins" (or via the Access API). Removing it in only one place still locks the person out.

## Deploy / redeploy
```bash
cd worker
npm install --no-package-lock --legacy-peer-deps
npm test
npx wrangler d1 migrations apply redbird-trails --remote     # only when a new migration exists
npx wrangler deploy --env public
node scripts/build-ui.mjs && npx wrangler deploy --env admin
```
Authenticate with `CLOUDFLARE_API_TOKEN` in your shell (never commit it).

## Backup and rollback
- Backup: `npx wrangler d1 export redbird-trails --remote --output backup.sql`
- Data: Admin → Versions → Restore (also restores map numbers). Imports: Import → Undo batch.
- Worker: `npx wrangler rollback --env admin` (or `--env public`). D1: `wrangler d1 time-travel restore`.

## Print extent and geocoding
If the boundary changes, re-run `node scripts/map/render-print-base.mjs` (until then the print page says "being updated"). `POST /api/geocode` tries the US Census geocoder (trusted only when the matched street equals the requested one), then OpenStreetMap Nominatim (≤1 request/second). Pins stay `approximate` until an admin confirms them.
