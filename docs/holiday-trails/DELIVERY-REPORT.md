# Delivery report: Red Bird Neighborhood Holiday Trails

Live: **https://redbird.iplcmiami.com/** (2026-10-16). Event: Saturday 2026-10-31, 6–9 PM ET. Admin: https://redbird-admin.pdarleyjr.workers.dev (Cloudflare Access).

## 1. What shipped, by stage
| Stage | Result | PR / commit |
|---|---|---|
| A Foundation | Baseline tag `baseline/redbird-before-holiday-trails-20261016`, cruft removed, tokens-only CSS, multi-page build with relative links, tests on `tests/unit` + Playwright | #3 `44e145a` |
| B Data | `shared/*` libraries, reconcile CLI (reproduces 47 rows / 46 addresses / 31 matched / 15 new), snapshot + D1 seed generators; 46 houses published | #3 |
| C Homepage | Active Halloween card, inactive Christmas card, 404/offline, legacy `/#section` redirect | #3 |
| D Map | Self-hosted MapLibre 6.14, Protomaps tiles z12–15, brand night style, GPS, nearest, visited, directions, compass, WebGL2 fallback | #3 |
| E Admin | Workers + D1 + Cloudflare Access (one-time PIN, two owner addresses), houses, pin drag, icons, CSV import with undo, versions, events | #3, #5 |
| F Print | Fixed-extent 300 dpi base + SVG overlay, Letter portrait/landscape; **plus** the 3D trail map flyer page `halloween/trail-map/` (PDF/print) | #3, #5 |
| G PWA | Manifest, icons, service worker, install/update UI, rollback stub, live data feed | #4 `75c77be` |
| Flyer + pins + icons | Flyer branch merged; building-snapped pins; transparent icon set; app/flyer icon parity test | #5 `f87bff5` |
| Domain | Moved to redbird.iplcmiami.com with the Christmas kill-switch | #6 |
| H Verify | CI, live QA, Lighthouse, reviews (below) | this PR |

## 2. Test results
| Suite | Result |
|---|---|
| Unit | 89 pass (icons alpha, app↔flyer icon parity, privacy scan, tokens, reconcile fixture, geometry) |
| Worker (Workers runtime + D1) | 28 pass (Access JWT fixtures: missing/bad/expired tokens 401, non-listed email 403, both allowlisted emails 200, CSRF, houses, import/undo, versions, public feed) |
| E2E, local, 5 projects | ~210 pass, 0 fail (map/PWA/admin specs on Chromium) |
| E2E against the **live domain** (chromium desktop+mobile, webkit mobile, firefox) | 185 + 124 pass, 0 fail |
| Accessibility (axe, WCAG 2.2 AA) | 0 violations on home, Halloween (map loaded), print, trail map, Christmas, admin |
| Kill-switch | Playwright swap test: legacy cache-first Christmas worker → kill-switch → new site, caches cleared |
| CI (GitHub Actions) | validate, worker, e2e green on #3, #4, #5, #6 |
| Live check | 7/7 on both the old address and the new domain |

## 3. Lighthouse (mobile) vs budgets
| Run | Page | Perf | A11y | LCP | CLS | TBT | Transfer | Budget |
|---|---|---|---|---|---|---|---|---|
| Live (redbird.iplcmiami.com) | Home | 1.00 | 1.00 | 1.2 s | 0.023 | ≤58 ms | 271 KiB | PASS (≥0.95, ≤2.0 s, ≤350 KiB) |
| Live | Halloween | 1.00 | 1.00 | 1.2 s | 0 | ≤34 ms | 158 KiB | PASS (≥0.90, ≤2.5 s, ≤500 KiB) |
| Local throttled | Home / Halloween | 0.99 / 0.96–0.98 | 1.00 | 1.8 / 2.2–2.5 s | – | 0 | 294 / 250 KiB | PASS |
JSON: `docs/qa/2026-holiday-trails/lighthouse/` and `lighthouse-live/`.

## 4. Screenshots and flyer comparison
`docs/qa/2026-holiday-trails/brand/` (flyer beside home and Halloween at 390/1440, print, Christmas), `live/` (home, map, print on the live domain), `admin/` (login/list/editor against a mocked API). Flyer elements carried into the UI: midnight-navy sky with violet/ember horizon, neon cardinal wordmark over cream "TRICK-OR-TREAT TRAIL", violet double rule, gold sparkles and moon, palm/house silhouettes with amber windows, cream marquee buttons with a neon-orange edge, coral script tagline, unlit Christmas card. Cardinal red is never body text or a fill behind cream text.

## 5. Data (public-safe)
Oct 16 export: 47 rows, 46 addresses, 31 matched (ids stop-01..31 unchanged), 15 new (#32–#46). Owner decisions applied: #10 "Haunted House", #05 "Halloween Stop", #36 name as submitted, boundary approved, 46 published. Pins: OSM building centroids for 44 houses (approximate until verified), owner GPS for #03 and #25 (verified). Production snapshot is v4 (a QA round-trip created v5 then v6 identical to v4).

## 6. Deviations
`docs/holiday-trails/DECISIONS-LOG.md` D1–D18 (tiles via Node script; Access then a short-lived password design reversed; icon set and #40 spider web; domain move; review fixes).

## 7. Gates
G1 Cloudflare: token supplied, used only for `redbird-*` resources. G2a: answered and applied. G2b: production D1 migrated/seeded after exports (backups local, git-ignored). G3: #3–#6 merged under the standing authorization after green QA. G4: approved by the owner, executed. G6: `snapshot.yml` (dispatch only) added. G7: no history rewrite or force-push anywhere.

## 8. Known limitations
- Not verified on physical devices: iOS Add to Home Screen/standalone, Android install prompt, GPS accuracy and compass while walking outdoors, phone print/save PDF, airplane-mode reopen, safe-area insets. Automated tests use mocked geolocation.
- The second admin address has not been confirmed to sign in; the owner address has. A non-listed address gets 403 (tested).
- 44 pins are approximate (building-accurate) until confirmed in the admin.
- The update toast after a real redeploy is covered by logic and unit/e2e checks, not by a live upgrade.
- Print/flyer extents are pre-rendered: a boundary change needs a developer re-render.
- The flyer is a snapshot of Oct 16; the app hints when newer houses exist and "Print latest map" is always current.

## 9. Rollback
- Site: revert the merge commit on `main` (Pages redeploys in ~1 min) or reset to the baseline tag. PWA: `node scripts/sw-rollback.mjs`, commit, push (never delete `sw.js`).
- Data: Admin → Versions → Restore; Import → Undo batch.
- Workers: `npx wrangler rollback --env admin|public`; D1: `wrangler d1 time-travel restore` or an export (`wrangler d1 export`).
- Domain: see `DOMAIN-SETUP.md` (give the custom domain back to the Christmas repo).

## 10. Domain switch times (UTC, 2026-10-16)
Christmas repo released the domain 15:29:00–15:29:08; this repo's domain PR merged 15:29:19; Pages custom domain set 15:29:22; new site answering by 15:30:05; canonical URLs updated 15:30:31; HTTPS enforced throughout. The old github.io address answers 301 to the new domain.
