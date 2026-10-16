## Red Bird Neighborhood Holiday Trails (M1)

Turns the site into a shared holiday homepage plus the Halloween trail with an interactive, self-hosted map, in the Red Bird flyer palette.

**What ships in this PR (stages A–D, F, G scaffolding)**
- Homepage with an active Halloween card and an inactive "Updating for this year's event" Christmas card; legacy `/#section` links redirect to `halloween/`.
- Brand re-theme from the flyer: tokens in `assets/css/tokens.css` only, neon cardinal wordmark, cream marquee buttons, violet rules, gold sparkles, night map style. Screenshots next to the flyer: `docs/qa/2026-holiday-trails/brand/`.
- Halloween page: MapLibre 6.14.0 (self-hosted), Protomaps tiles z12–15, GPS "Find my location", nearest house with distance and direction, visited tracking, directions links, accessible house list, WebGL2 fallback.
- Printable fixed-extent map (`halloween/print/`), Letter portrait/landscape, collision-free numbered markers, legend, version footer.
- Shared libraries (`shared/`) with reconciliation that reproduces the Oct 16 export totals (47 rows, 46 addresses, 31 matched, 15 new); only the 31 approved houses are published until the owner approves the rest.
- Service worker and manifest are generated but **registration is off** (`data/site.json features.serviceWorker`) until M2.

**Verification**
- Unit: 83 tests pass (`npm test`). Generated files and snapshot are current (`npm run check`).
- E2E (`npx playwright test`): 180 passed / 24 skipped (WebGL map specs run on Chromium only) across chromium mobile+desktop, webkit mobile+desktop, firefox; axe has zero violations; privacy scan clean.
- Lighthouse (mobile, local): Home perf 0.99, a11y 1.0, LCP 1.86 s, CLS 0.023, TBT 0, 292 KiB. Halloween perf 0.99, a11y 1.0, LCP 2.1 s, 236 KiB.

**Not in this PR**: Worker/D1 admin (stage E) and PWA activation (M2). Deviations are in `docs/holiday-trails/DECISIONS-LOG.md`.
