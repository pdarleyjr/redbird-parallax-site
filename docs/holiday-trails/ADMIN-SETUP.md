# Admin setup (Cloudflare Workers + D1 + Access)

Everything here is already provisioned (2026-10-16). This document is the record and the recovery guide.

| Piece | Name / value |
|---|---|
| Cloudflare account | `265122b6d6f29457b0ca950c55f3ac6e` (shared with unrelated MBFD projects; this project only touches `redbird-*`) |
| D1 database | `redbird-trails` (`bd3d16ad-1545-466c-853f-a1ade401eed2`) |
| Public Worker (read-only) | `redbird-public` → https://redbird-public.pdarleyjr.workers.dev |
| Admin Worker | `redbird-admin` → https://redbird-admin.pdarleyjr.workers.dev |
| Access team | `darl.cloudflareaccess.com` |
| Access application | "Red Bird Trails Admin" (`9f443a40-ce7f-4b2c-aa92-0c685b903a60`), host `redbird-admin.pdarleyjr.workers.dev`, 24 h sessions, policy "Red Bird admins" = allowed emails |
| Worker vars | `ACCESS_TEAM`, `ACCESS_AUD` (in `worker/wrangler.jsonc`) |
| Worker secret | `ADMIN_EMAILS` (comma-separated allowlist; never committed) |

## How the admin is protected (two layers, fail closed)
1. Cloudflare Access sits in front of the whole `redbird-admin` host (email one-time PIN).
2. Every `/api/*` request verifies the `Cf-Access-Jwt-Assertion` (issuer, audience, signature via the team JWKS) **and** checks the email against `ADMIN_EMAILS`. Missing or invalid config returns 503/401/403. Mutations also need a same-origin `Origin` header and JSON.

## Using it
Open https://redbird-admin.pdarleyjr.workers.dev, enter an allowed email, and type the 6-digit code Cloudflare emails you. Sections: **Houses** (add, edit, drag the pin, choose the icon, publish, unpublish, archive), **Import** (choose the registration CSV; the file is read in your browser and only date, address and house name are uploaded), **Versions** (restore any earlier published version), **Events** (Christmas: Updating / Published), **Activity**.

A published change reaches the public site within about 30 seconds (the public Worker caches for 30 s) as one new snapshot version, so the directory, map, count, nearest house and print page always agree.

## Add or remove an admin
```bash
cd worker
npx wrangler secret put ADMIN_EMAILS --env admin     # comma-separated list, e.g. one@example.com,two@example.com
```
Also add the email to the Access policy (Zero Trust → Access → Applications → Red Bird Trails Admin → Policies).

## Deploy / redeploy
```bash
cd worker
npm install --no-package-lock --legacy-peer-deps
npm test                                   # vitest + Workers runtime (23 tests)
npx wrangler d1 migrations apply redbird-trails --remote   # only when a new migration exists
npx wrangler deploy --env public
node scripts/build-ui.mjs && npx wrangler deploy --env admin
```
Authenticate with `CLOUDFLARE_API_TOKEN` in your shell (never commit it).

## Backup and rollback
- Backup before a production migration: `npx wrangler d1 export redbird-trails --remote --output backup.sql`
- Data rollback: Admin → Versions → Restore (creates a new version). Import mistakes: Admin → Import → Undo batch.
- Worker rollback: `npx wrangler rollback --env admin` (or `--env public`).
- D1 point-in-time: `npx wrangler d1 time-travel restore redbird-trails --timestamp <ISO time>`.

## Print extent
The print map base image is pre-rendered for a fixed extent. If the boundary changes, a developer must re-run `node scripts/map/render-print-base.mjs`; until then the print page shows “being updated”.

## Geocoding
`POST /api/geocode` tries the US Census geocoder (trusted only when the matched street equals the requested one), then OpenStreetMap Nominatim (≤1 request/second, identifying User-Agent). Miami-Dade GIS address points were not used (no verified public endpoint with clear terms). Pins stay `approximate` until an admin confirms them.
