## M2: PWA and live data feed

- Registers the generated service worker (`data/site.json` `features.serviceWorker: true`): precached shell, network-first pages and data, cache-first versioned assets and map pack, user-confirmed update toast (never auto-reload, deferred while location tracking is on), install prompt / iOS instructions, rollback stub (`node scripts/sw-rollback.mjs`).
- Points the site at the live read-only feed `https://redbird-public.pdarleyjr.workers.dev`; bundled snapshot remains the fallback (CSP `connect-src` allows only that origin).
- Fixes from review: navigation/print-base/API routing in the service worker, non-OK responses fall back to cache, offline banner and live-data-unavailable note.
- Tests: PWA e2e (manifest and icon sizes, installability errors none, offline reload, newer live snapshot replaces bundled, rollback stub, SW version independent of data), all e2e specs answer the API from bundled data.
- Dispatch-only workflow `snapshot.yml` refreshes the bundled list from the live feed via a PR.

Verification: unit 87, Worker 37, e2e green locally; Lighthouse budgets unchanged.
