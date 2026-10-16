# Red Bird Neighborhood Holiday Trails

A neighborhood site on GitHub Pages: a shared holiday homepage, the Red Bird Trick-or-Treat Trail with an interactive map, nearest-house finder, visited tracking and a printable map, plus an optional Cloudflare Workers + D1 admin. Vanilla HTML, CSS and ES modules; no framework and no runtime dependencies in the browser.

Live: https://pdarleyjr.github.io/redbird-parallax-site/ · Event: Saturday, October 31, 2026, 6–9 PM (America/New_York).

## Develop
```bash
npm ci
npm run dev            # http://127.0.0.1:4173/redbird-parallax-site/   (BASE=/ simulates a root domain)
npm run build          # regenerate pages, sw.js, manifest, legacy redirect (run after any change to assets or data)
npm run check          # generated files, snapshot and seed SQL are current
npm test               # unit tests
npx playwright test    # e2e (chromium, webkit, firefox); needs: node worker/scripts/build-ui.mjs once
npm run lighthouse     # mobile budgets from docs/holiday-trails/06-QA.md
cd worker && npm install --no-package-lock --legacy-peer-deps && npm test   # Worker tests
```

## Layout
- `templates/` and `scripts/build.mjs`: multi-page build with relative `{{root}}` links.
- `data/`: `site.json` (events registry, API base, feature flags), `events/`, `halloween-2026.public.json` (the bundled public snapshot), `reconcile/` (public-safe decisions, roster, geocodes), `icons.json`.
- `shared/`: DOM-free libraries used by the browser, build scripts and Workers.
- `assets/`: CSS (colors live only in `css/tokens.css`), JS, self-hosted MapLibre, map tiles and style, marker icons.
- `worker/`: public read-only Worker, admin Worker and UI, migrations, tests.
- `docs/holiday-trails/`: architecture, UX and technical specs, QA, risk and rollback, decisions log, admin and domain setup, delivery report.

## Data and privacy
Public data is one snapshot (`data/halloween-2026.public.json`, schema in `shared/snapshot-schema.mjs`). Registration CSVs with contact details are never committed (`private/` and `*.csv` are ignored); the admin parses CSVs in the browser and uploads only date, address and house name. Visited houses and location stay on the visitor's device.

## Credits
Map data © OpenStreetMap contributors, Protomaps (ODbL). Icons: Microsoft Fluent Emoji 3D (MIT, `assets/img/source/fluent/LICENSE.txt`) and Red Bird artwork. Fonts: Poppins and Yellowtail (OFL). Original organizer map geography: Miami-Dade County GIS.
