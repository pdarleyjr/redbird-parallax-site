## Red Bird Neighborhood Holiday Trails (M1)

Turns the site into a shared holiday homepage plus the Halloween trail with an interactive, self-hosted map, in the Red Bird flyer palette. All 46 houses are published (owner approved 2026-10-16).

**Ships in this PR**
- Homepage with an active Halloween card and an inactive "Updating for this year's event" Christmas card; legacy `/#section` links redirect to `halloween/`.
- Flyer palette: tokens only in `assets/css/tokens.css`, neon cardinal wordmark, cream marquee buttons, violet rules, gold sparkles, night map style. Screenshots next to the flyer: `docs/qa/2026-holiday-trails/brand/`.
- Halloween page: MapLibre 6.14.0 (self-hosted), Protomaps tiles z12-15, "Find my location", nearest house with distance and direction, visited tracking, directions, accessible house list, WebGL2 fallback.
- Printable fixed-extent map (`halloween/print/`), Letter portrait/landscape, collision-free numbered markers, legend.
- Owner decisions applied: #36 name as submitted, verified pins for #03 and #25, boundary approved, 2024 icons for #33/#36/#40, Microsoft Fluent Emoji 3D (MIT) on a brand badge for the other new houses.
- Shared libraries with reconciliation that reproduces the Oct 16 export (47 rows, 46 addresses, 31 matched, 15 new); sanitized fixture committed (date, address, house name only).
- Cloudflare Worker + D1 admin (password sign-in, import with undo, versions, events) is deployed separately; code and 37 Worker tests are in `worker/`. Service worker registration stays off until the M2 PR.

**Verification**
- CI: validate, worker and e2e jobs pass (Chromium, WebKit and Firefox, axe zero violations).
- Local: 87 unit tests, 37 Worker tests, 199 e2e tests; Lighthouse mobile Home perf 0.99 / LCP 1.86 s, Halloween perf 0.99 / LCP 2.1 s.
- Security and code reviews ran; findings fixed (DECISIONS-LOG D15).

Rollback: revert the merge commit (Pages redeploys in about a minute); see docs/holiday-trails/07-RISK-ROLLBACK.md. Deviations: docs/holiday-trails/DECISIONS-LOG.md.
