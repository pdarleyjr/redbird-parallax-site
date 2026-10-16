# Red Bird Neighborhood Holiday Trails — planning package

Planning only (2026-10-16). Nothing here changes the live site.

| Doc | What it covers |
|---|---|
| [01-AUDIT](01-AUDIT.md) | Current state of all four repos, reusable assets, security finding |
| [02-RECONCILIATION](02-RECONCILIATION.md) | Oct 16 registrations vs the 31 published houses (47 rows → 46 addresses, 15 new) |
| [03-ARCHITECTURE](03-ARCHITECTURE.md) | Decisions: GitHub Pages + self-hosted MapLibre/Protomaps + Cloudflare Workers/D1/Access |
| [04-UX-SPEC](04-UX-SPEC.md) | Homepage, Halloween map, nearest house, print, admin, install UI, accessibility |
| [05-TECH-SPEC](05-TECH-SPEC.md) | File layout, routes, schema, APIs, algorithms, PWA, print, stages |
| [06-QA](06-QA.md) | Automated tests, budgets, real-device checklist, acceptance |
| [07-RISK-ROLLBACK](07-RISK-ROLLBACK.md) | Milestones, rollback, approval gates G1–G7 |
| [SONNET_HANDOFF](SONNET_HANDOFF.md) | Self-contained implementation brief for Claude Sonnet 5.5 |

Brand: all pages use the Red Bird Neighborhood palette sampled from the owner's flyer ([brand/redbird-flyer-2026.webp](brand/redbird-flyer-2026.webp)); tokens in 04-UX-SPEC §4.1.

Owner decisions so far (2026-10-16): stay on github.io through Halloween; 3800 SW 58th Ave → "Haunted House" with a pumpkin icon; 5792 SW 39th St keeps "Halloween Stop"; purge the leaked 2025 CSVs from `red-bird-halloween-trail` (separate task).

Privacy: the 15 new registrations are shown as `[new #N …]` placeholders until the owner approves them for publication (gate G2a). No contact details appear anywhere in this repo.
