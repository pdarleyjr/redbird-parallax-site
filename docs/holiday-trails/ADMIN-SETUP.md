# Admin setup (Cloudflare Workers + D1, password sign-in)

Provisioned 2026-10-16. This is the record and the recovery guide. Auth design changed on 2026-10-16 from Cloudflare Access to a password stored only in Cloudflare (owner decision); see DECISIONS-LOG D12.

| Piece | Name / value |
|---|---|
| Cloudflare account | `265122b6d6f29457b0ca950c55f3ac6e` (shared with unrelated MBFD projects; this project only touches `redbird-*`) |
| D1 database | `redbird-trails` (`bd3d16ad-1545-466c-853f-a1ade401eed2`) |
| Public Worker (read-only) | `redbird-public` → https://redbird-public.pdarleyjr.workers.dev |
| Admin Worker | `redbird-admin` → https://redbird-admin.pdarleyjr.workers.dev |
| Secrets (Worker, never committed) | `ADMIN_PASSWORD` (typed by the owner), `SESSION_SECRET` (random, 32+ characters) |

## Setting the password (owner does this in their own terminal)
```bash
cd worker
npx wrangler login            # or set CLOUDFLARE_API_TOKEN in your shell
npx wrangler secret put ADMIN_PASSWORD --env admin
```
Wrangler prompts for the value; type or paste the password there. Do not put it in chat, in a file in the repo or on a command line. Until it is set, the admin answers “The admin is not set up yet” and nothing can be changed. To change the password, run the same command again.

## How sign-in works (fail closed)
- `POST /api/login {password}`: both values are SHA-256 hashed and compared in constant time. Failed attempts are limited to **5 per 15 minutes per address** and **20 per hour overall** (`login_attempts` table, hashed address only), answering 429. The error message never says what was wrong.
- A correct password sets the cookie `rb_admin` = `{iat, exp}` signed with HMAC-SHA256 using `SESSION_SECRET`; `HttpOnly; Secure; SameSite=Strict; Path=/`, 12 hours.
- Every `/api/*` route except login and logout needs a valid, unexpired cookie (401 otherwise, 503 if the secrets are missing). Mutations also need a same-origin `Origin` header and a JSON content type (CSRF).
- The audit log records the actor `admin`, the user agent (80 characters) and a truncated hash of the address, never the raw address.

## Rotation
- **Password:** `npx wrangler secret put ADMIN_PASSWORD --env admin` (existing sessions stay valid until they expire; rotate the session secret as well to end them).
- **Sign everyone out:** `npx wrangler secret put SESSION_SECRET --env admin` with a new random value (for example the output of `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). Every cookie becomes invalid immediately.

## Using it
Open https://redbird-admin.pdarleyjr.workers.dev, enter the password (a password manager can fill it) and use **Houses** (add, edit, drag the pin, choose the icon, publish, unpublish, archive), **Import** (the CSV is read in your browser; only date, address and house name are uploaded), **Versions** (restore an earlier published version), **Events** (Christmas: Updating or Published) and **Activity**. **Sign out** ends the session.

A published change reaches the public site within about 30 seconds as one new snapshot version, so the directory, map, count, nearest house and print page always agree.

## Deploy / redeploy
```bash
cd worker
npm install --no-package-lock --legacy-peer-deps
npm test                                                     # vitest + Workers runtime
npx wrangler d1 migrations apply redbird-trails --remote     # only when a new migration exists
npx wrangler deploy --env public
node scripts/build-ui.mjs && npx wrangler deploy --env admin
```

## Backup and rollback
- Backup before a production change: `npx wrangler d1 export redbird-trails --remote --output backup.sql`
- Data: Admin → Versions → Restore (creates a new version and restores map numbers too). Import mistakes: Admin → Import → Undo batch.
- Worker: `npx wrangler rollback --env admin` (or `--env public`).
- D1 point in time: `npx wrangler d1 time-travel restore redbird-trails --timestamp <ISO time>`.

## Print extent
The print map base image is pre-rendered for a fixed extent. If the boundary changes, re-run `node scripts/map/render-print-base.mjs`; until then the print page shows “being updated”.

## Geocoding
`POST /api/geocode` tries the US Census geocoder (trusted only when the matched street equals the requested one), then OpenStreetMap Nominatim (≤1 request/second, identifying User-Agent). Pins stay `approximate` until an admin confirms them.
