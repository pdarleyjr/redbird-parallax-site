# Delivery report: Red Bird Neighborhood Holiday Trails

Date: 2026-10-16. Site: https://pdarleyjr.github.io/redbird-parallax-site/ . Event: Saturday 2026-10-31, 6–9 PM ET.

## 1. Summary by stage
| Stage | Result | Where |
|---|---|---|
| A Foundation | Done. Baseline tag `baseline/redbird-before-holiday-trails-20261016`, cruft removed, CSS split with one tokens file, multi-page build with relative `{{root}}` links, `serve.mjs` BASE support, `.nojekyll`, tests moved to `tests/unit` and Playwright `tests/e2e` | PR #3 (merge `44e145a`) |
| B Data | Done. `shared/*` libraries (address, names, csv, reconcile, numbering, geo, snapshot schema, directions, print layout) with unit tests; `scripts/reconcile.mjs`, `geocode.mjs`, `make-snapshot.mjs`, `emit-seed.mjs`; 46 houses published | PR #3 |
| C Homepage | Done. Active Halloween card, inactive Christmas card, 404, offline, legacy `/#section` redirect | PR #3 |
| D Map | Done. Self-hosted MapLibre 6.14.0, Protomaps tiles z12–15, brand night style, GPS, nearest house, visited, directions, compass, WebGL2 fallback | PR #3 |
| E Admin | Done and deployed. Cloudflare Workers + D1, password sign-in, houses, pin drag, icons, CSV import with undo, versions with restore, events | PR #3 (`worker/`), live on workers.dev |
| F Print | Done. Fixed-extent 300 dpi base, SVG overlay, collision-free markers, Letter portrait and landscape | PR #3 |
| G PWA | Done in PR #4 (M2): manifest, icons, generated service worker, install and update UI, rollback stub | PR #4 |
| H Verify | CI, Lighthouse, reviews, live checks (below). Real-device checklist (M3) is the owner's walk-through | this report |

Key commits: `9b7f907` shared libraries, `9910acb` M1 app, `34be996` worker/admin, `bc007b5` cross-OS hash fix, `edbfdfe` owner decisions + icons + password auth + review fixes, `44e145a` M1 merge, `cc9848e`/`0ffac90` M2 (PR #4).

## 2. Test results
| Suite | Result |
|---|---|
| Unit (`npm test`) | 87 pass |
| Worker (`worker/`, Workers runtime, D1) | 37 pass (auth, rate limits, tampered/expired cookies, CSRF, houses, import/undo, versions, public feed) |
| E2E (`npx playwright test`, 5 projects) | 201 pass, 57 skipped (WebGL map and Service Worker specs run on Chromium only), 0 fail |
| Accessibility (axe, WCAG 2.2 AA) | 0 violations on home, Halloween (with map), print, Christmas, admin login/houses |
| Privacy scan | Clean: no emails or phone numbers in tracked files; `private/` and CSVs ignored; snapshot schema rejects extra fields |
| CI | PR #3: validate, worker and e2e all green (run 38913435197). PR #4: see its checks |
| Live check (`scripts/qa/live-check.mjs`) | After the M1 merge: 7/7 PASS (cards, 46 houses, 46 map pins, print 46 markers, manifest, API v3, no errors). Evidence: `docs/qa/2026-holiday-trails/live/` |

## 3. Lighthouse (mobile, local) against budgets
| Page | Perf (≥) | A11y | LCP (≤) | CLS (≤0.05/0.1) | TBT (≤) | Transfer (≤) |
|---|---|---|---|---|---|---|
| Home | 0.99 (0.95) | 1.00 | 1.79–1.86 s (2.0 s) | 0.023 | 0 ms (100) | 294 KiB (350) |
| Halloween | 0.97–0.98 (0.90) | 1.00 | 2.18–2.35 s (2.5 s) | 0 | 0 ms (200) | 250 KiB (500) |
JSON: `docs/qa/2026-holiday-trails/lighthouse/`. A bug found on the way: live-data re-render fetched all 46 house icons eagerly; fixed (loading attribute set before `src`, and identical live data no longer re-renders).

## 4. Screenshots
- Brand versus flyer: `docs/qa/2026-holiday-trails/brand/comparison-flyer-home-halloween.png`, plus `home-*`, `halloween-*`, `print-*`, `christmas-*` at 390 and 1440.
- How each flyer element was carried over: midnight-navy sky gradient with violet/ember horizon (hero canvases only); neon cardinal wordmark "RED BIRD" with cream "TRICK-OR-TREAT TRAIL"; violet double rule; gold 4-point sparkles and cream moon on the homepage; palm/house silhouette strip with amber windows; cream marquee buttons with a neon-orange edge (arrow-banner model); coral script tagline ("Same Neighborhood. More Magic."); ink-plum panels with cardinal neon frame on the active card; the Christmas card is an unlit sign (neon off). Cardinal red is never body text and never a fill behind cream text; map markers use cardinal with cream numerals as graphics.
- Halloween map: `live/halloween-map-1280.png`. Print page: `live/print-1280.png`. Admin: `admin/admin-login.png`, `admin-houses.png`, `admin-editor.png`.

## 5. Reconciliation (public-safe)
Oct 16 export: 47 rows, 46 distinct addresses, 31 matched to published houses (ids `stop-01..31` unchanged), 15 new (#32–#46 by earliest submission), 1 conflict (3800 SW 58th Ave, resolved by owner to "Haunted House"), 1 blank name (5792 SW 39th St, kept "Halloween Stop"), 1 zip mismatch (#38), 0 published houses missing. All owner decisions (G2a) are applied: #36 name as submitted, 2024 icons for #33/#36/#40, boundary approved, verified pins for #03 and #25, publish all 46. Remaining: verify the other 44 approximate pins in the admin (walk them during M3).

## 6. Deviations
See `docs/holiday-trails/DECISIONS-LOG.md` (D1–D15): tiles extracted with a Node script instead of the go-pmtiles binary; visited marker is an amber ring and numeral; admin auth is a password plus signed cookie instead of Cloudflare Access; Fluent icon for #10; clipped 2024 icons; street labels from z13; Miami-Dade GIS not used; review fixes.

## 7. Gates
G1 Cloudflare: cleared (token supplied; used only for `redbird-*` resources). G2a: answered and applied. G2b: production D1 migrated and seeded after an export backup. G3: PR #3 merged under the standing authorization after green CI, e2e, axe, privacy and Lighthouse; PR #4 likewise. G4 (domain): not requested; instructions in `DOMAIN-SETUP.md`. G6: `snapshot.yml` (dispatch only) added. G7: no history rewrite or force-push.

## 8. Known limitations and real-device checklist (M3, owner)
- The admin needs the owner to type `ADMIN_PASSWORD` into `wrangler secret put` (ADMIN-SETUP.md). Until then it answers "not set up yet". The deployed admin screens have been exercised only against a mocked API (UI) and the Worker test suite (API), not by a live sign-in.
- Not verified on real hardware: iOS Add to Home Screen and standalone launch, Android install prompt, GPS accuracy and compass arrow while walking, print/save PDF from phones, airplane-mode reopen, safe-area insets. WebKit and Firefox run the non-map specs in CI; the WebGL map specs run on Chromium with software GL.
- All 44 geocoded pins are approximate until confirmed in the admin.
- Update toast after a real deploy is covered by logic, not by a live upgrade test.
- Print base map needs a developer re-render if the boundary changes.

## 9. Rollback
- Site: revert the merge commit on `main` (Pages redeploys in about a minute) or reset to tag `baseline/redbird-before-holiday-trails-20261016`.
- PWA: `node scripts/sw-rollback.mjs`, commit and push (never delete `sw.js`).
- Data: Admin → Versions → Restore; Import → Undo batch.
- Workers: `npx wrangler rollback --env admin|public`. D1: `wrangler d1 time-travel restore`, or the export taken before the owner-decisions delta (`private/d1-backup-before-owner-decisions.sql`, local, git-ignored).
