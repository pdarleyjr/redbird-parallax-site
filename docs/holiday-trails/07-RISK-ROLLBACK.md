# Red Bird Holiday Trails — Risk, Rollback & Deployment

> Note: the 15 registrations not yet approved for publication (stops #32–#46) appear as `[new #N …]` placeholders until gate G2a. The full table is regenerated locally by `scripts/reconcile.mjs` from the private CSV and kept in the owner's local plan copy.

## 7. Risk, rollback & deployment (Deliverable 7)

- **Branching:** all work on `feat/holiday-trails-2026` (from `origin/main`) in a dedicated worktree; PRs into main only via the user. Tag `baseline/redbird-before-holiday-trails-20261016` on current main before merge.
- **Releases:**
  - **M0 (Oct 18, small PR on the current site):** once G2a is answered, update `data/houses-2026.json` to the reconciled list (46 or owner-amended) and relax the "31" tests to the new count; label the organizer map "Map shows the first 31 houses; new houses are listed below". Gets the latest houses public within 2 days with near-zero risk.
  - **M1 (Oct 22):** homepage + routes, Halloween with interactive map, GPS/nearest/visited/directions, print page, install-free (no SW yet); data from bundled snapshot (approximate pins labeled).
  - **M2 (Oct 24):** PWA (manifest + SW — shipped last so a faulty SW has the least time to stick), Workers + D1 + Access + event-critical admin (list, add, edit, drag-verify, icon, publish/unpublish/archive/restore, CSV import with Undo, version restore, Christmas status toggle); site reads live API.
  - **M3 (Oct 27):** real-device QA, all pins walked & verified. **Code freeze Oct 28**, content freeze Oct 30 18:00 (run snapshot.yml).
  - **November:** full renumber UI, activity view polish, Christmas details form + published Christmas page, archive Halloween 2026, retire superseded static map.
- **Rollback:** public = revert merge commit on main (Pages redeploys in ~1 min) or reset Pages to tag; SW is network-first for HTML so a revert reaches users on next load; bump SW version on revert. Data = admin "Restore version" (snapshot) or batch "Undo". Worker = `wrangler rollback`. D1 = Time Travel restore (`wrangler d1 time-travel restore`; retention believed 7 days on the free plan — confirm) plus the real backup: admin "Export backup" button (`GET /api/export.json`, full public-safe DB dump) and a manual `wrangler d1 export` before every production migration. PWA rollback = replace `sw.js` with the rollback stub (§5.9), then revert.
- **Backend outage on event night:** public site continues on bundled/cached snapshot (≤30 min stale); no features depend on the Worker except freshness.
- **PWA cache risk:** HTML/data network-first; version bump deletes old caches; kill-switch for legacy domain SW (G4). Test "stuck old list" scenario in E2E.
- **Map provider risk:** none at runtime (self-hosted tiles). Protomaps build is ODbL — attribution on screen & print.
- **Geo accuracy risk:** approximate pins labeled; publication of `verified` requires admin; M3 includes walking verification of pins by the organizer.
- **Concurrency:** local checkout `D:\GitHub_Repos\redbird-parallax-site` is stale/dirty — never used; worktree from origin. Christmas repo untouched.
- **Approval gates (Sonnet must stop and ask):**
  - **G1** Cloudflare: account login (`wrangler login` by the user), creating D1/Workers, creating the Access application & policy (user does in dashboard or approves each command), setting secrets.
  - **G2a** (request on day 1) Owner answers §2.4 items; then commit the public-safe decisions file + sanitized fixture (publishes the 15 new names/addresses). Until G2a, CI uses a synthetic fixture with the same structure (same counts/edge cases, fictional names/addresses) and count assertions read from the fixture, never a literal.
  - **G2b** Applying migrations/seed to production D1.
  - **G3** Merging to `main` (production deploy) — each milestone.
  - **G4** Moving `redbird.iplcmiami.com` from the Christmas repo to this repo (Pages settings + CNAME + kill-switch SW). **Owner decided 2026-10-16: stay on github.io through Halloween**; revisit in November before Christmas activation.
  - **G5** Privacy remediation in `red-bird-halloween-trail` — **approved in principle by owner 2026-10-16 ("Remove + purge history")**, run as its own task immediately after plan approval, independent of the app work: fresh mirror clone → back up the mirror to a private local folder → `git filter-repo --invert-paths --path Red_Bird_Trick-or-Treat_Trail_2025-10-15_20_02_34.csv --path public/data/participants.csv --path data/participants.csv` (plus any other `*.csv` with contact/household columns found by a full-history scan; replace the participants page's data with a names+addresses-only file if the page must keep working) → verify with `git log --all -- '*.csv'` and a regex scan for emails/phones across all history → show the user the exact force-push command and get a final "yes" → `git push --force --mirror` → open a GitHub Support "remove sensitive data" request for cached views/PR refs (the user submits it). Also apply the same scan to `redbird-parallax-site` history (household-name CSV in `aac05c1` and earlier) and report; rewriting that repo's history is a separate yes/no.
  - **G6** Enabling `snapshot.yml` with `contents: write` (bot commits to main).
  - **G7** Any history rewrite / force push / branch deletion anywhere; deleting the `gh-pages` branch (recommended later, not required).

---

