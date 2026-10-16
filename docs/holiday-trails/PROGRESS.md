# Implementation progress (durable checklist)

Updated at every commit. Stages A–H per 05-TECH-SPEC §8.

## Gates
| Gate | Status |
|---|---|
| G1 Cloudflare login/Access | **Cleared 2026-10-16**: owner supplied a Wrangler API token (kept only in the process environment, never committed). Account `265122b6d6f29457b0ca950c55f3ac6e`, Access team `darl.cloudflareaccess.com`, workers.dev subdomain `pdarleyjr`. The account also hosts unrelated MBFD resources: this project only creates/changes resources named `redbird-*`. |
| G2a reconciliation answers (#36 name, icons, boundary, pins #03/#25, publish #32–46) | Questions sent 2026-10-16; waiting. Only the 31 approved houses ship until answered. |
| G2b production D1 seed | Pre-authorized when QA green. |
| G3 merge milestones to main | Pre-authorized when milestone QA green. |
| G4 domain move | Not requested. Owner will create a GoDaddy subdomain of iplcmiami.com themselves; see `DOMAIN-SETUP.md` (to be written). |
| G6 snapshot.yml | Pre-authorized when QA green. |
| G7 history rewrite/force-push | Not requested. |

## Stage A — Foundation
- [x] baseline tag (local) `baseline/redbird-before-holiday-trails-20261016`
- [x] cruft removal (root *.ps1, unreferenced media, legacy icons)
- [x] CSS split + tokens.css (flyer palette) + raw-color test
- [x] multi-page build with `{{root}}`, partials, `--check`
- [x] data/site.json, data/events/halloween-2026.json
- [x] serve.mjs BASE + MIME, .nojekyll
- [x] tests migrated: `tests/unit` + `@playwright/test` `tests/e2e`

## Stage B — Data
- [x] shared/{address,names,csv,reconcile,numbering,geo,snapshot-schema,directions,print-layout} + unit tests (83)
- [x] reconcile reproduces 47 rows / 46 addresses / 31 matched / 15 new against the private CSV (local-only test)
- [x] scripts/geocode.mjs, make-snapshot.mjs → data/halloween-2026.public.json (31 houses, 29 located)
- [ ] emit D1 seed SQL (with Stage E)

## Stage C — Homepage
- [x] home, christmas shell, 404, offline, legacy hash redirect

## Stage D — Map
- [x] tiles (24 tiles z12–15), glyphs, night + print styles, marker icons, MapLibre 6.14.0 vendored
- [x] runtime: lazy map, markers, GPS, nearest, visited, directions, compass, WebGL2 fallback

## Stage F — Print
- [x] print base renderer, projection, de-overlap, page (portrait + landscape)

## Stage G — PWA
- [x] manifest, icons, sw.js generator, install/update UI (service worker registration off until M2 flag)

## Stage E — Admin (worker/)
- [ ] scaffold, migrations, APIs, UI, tests; ADMIN-SETUP.md

## Stage H — Verify & deliver
- [ ] CI, Lighthouse, screenshots vs flyer, reviews, DELIVERY-REPORT.md

## Update 2026-10-16 (late)
- [x] G2a answers applied: 46 houses published in the snapshot, manual pins verified, boundary approved, icons from 2024 originals + Fluent Emoji 3D on a brand badge
- [x] Auth switched to password + signed cookie (Access app to be removed)
- [ ] Owner types ADMIN_PASSWORD (see ADMIN-SETUP.md)
