# Implementation progress (durable checklist)

Updated at every commit. Stages A–H per 05-TECH-SPEC §8. SHA column filled as commits land.

## Gates
| Gate | Status |
|---|---|
| G1 Cloudflare login/Access | Steps sent to owner 2026-10-16; waiting. Admin code prepared meanwhile. |
| G2a reconciliation answers (#36 name, icons, boundary, pins #03/#25, publish #32–46) | Questions sent 2026-10-16; waiting. Only the 31 approved houses ship until answered. |
| G2b production D1 seed | Pre-authorized when QA green; blocked on G1. |
| G3 merge milestones to main | Pre-authorized when milestone QA green. |
| G4 domain move | Not requested (stay on github.io). |
| G6 snapshot.yml | Pre-authorized when QA green. |
| G7 history rewrite/force-push | Not requested. |

## Stage A — Foundation
- [ ] baseline tag (local)
- [ ] cruft removal
- [ ] CSS split + tokens.css (flyer palette) + token test
- [ ] multi-page build with `{{root}}`
- [ ] data/site.json, data/events/halloween-2026.json
- [ ] serve.mjs BASE + MIME, .nojekyll
- [ ] tests migrated (unit + e2e)

## Stage B — Data
- [ ] shared/{address,names,csv,reconcile,numbering,geo,snapshot-schema}
- [ ] scripts/reconcile.mjs, make-snapshot.mjs

## Stage C — Homepage
- [ ] home, christmas shell, 404, offline, legacy redirect

## Stage D — Map
- [ ] tiles/style/glyph/icons pipeline
- [ ] runtime (map, GPS, nearest, visited, directions)

## Stage E — Admin (worker/)
- [ ] scaffold, migrations, APIs, UI, tests; ADMIN-SETUP.md

## Stage F — Print
- [ ] print base render, projection, page

## Stage G — PWA
- [ ] manifest, icons, sw.js, install/update UI

## Stage H — Verify & deliver
- [ ] CI, Lighthouse, screenshots vs flyer, reviews, DELIVERY-REPORT.md
