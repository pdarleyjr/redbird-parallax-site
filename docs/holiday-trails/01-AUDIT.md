# Red Bird Holiday Trails — Audit

> Note: the 15 registrations not yet approved for publication (stops #32–#46) appear as `[new #N …]` placeholders until gate G2a. The full table is regenerated locally by `scripts/reconcile.mjs` from the private CSV and kept in the owner's local plan copy.

## 0. Context

The primary site `pdarleyjr/redbird-parallax-site` (GitHub Pages, `https://pdarleyjr.github.io/redbird-parallax-site/`) currently opens straight into a static Halloween 2026 page with 31 approved houses and an organizer-supplied PNG/PDF map. Registrations kept coming: the Oct 16 export has 47 rows / 46 distinct addresses. The owner wants (a) a shared "Red Bird Neighborhood Holiday Trails" homepage with an active Halloween card and an inactive "Updating for this year's event" Christmas card, (b) a real interactive map with GPS + nearest house + visited tracking, (c) a dynamic printable map, (d) a no-code admin with CSV import, and (e) one installable PWA — all free/near-free, lightweight, and safe for public use. This plan is the complete design; Sonnet 5.5 implements it after approval.

**Immediate post-approval step (Opus):** create branch `plan/holiday-trails-2026` from `origin/main` in a fresh worktree of `D:\GitHub_Repos\redbird-parallax-site` (the existing local checkout is 3 commits behind and has 500+ unrelated dirty files — do not touch it), split this plan into `docs/holiday-trails/{01-AUDIT,02-RECONCILIATION,03-ARCHITECTURE,04-UX-SPEC,05-TECH-SPEC,06-QA,07-RISK-ROLLBACK,SONNET_HANDOFF}.md`, commit, push, open a **draft** PR. No application code, no deploy. In parallel, start the G5 privacy remediation (§7) as its own session, since it is urgent and touches a different repo.

**Owner decisions recorded 2026-10-16:** (1) purge the leaked 2025 CSVs from `red-bird-halloween-trail` including history (final force-push still shown for a last yes); (2) keep `pdarleyjr.github.io/redbird-parallax-site/` through Halloween — no domain move; (3) 3800 SW 58th Ave publishes as "Haunted House" with a pumpkin icon; (4) 5792 SW 39th St keeps "Halloween Stop".

---


## 1. Current-state audit (Deliverable 1) — verified unless marked

### 1.1 redbird-parallax-site (primary) — main @ `ea72e49` (2026-10-09)
- **Stack:** vanilla HTML/CSS/ES modules, zero runtime deps. devDeps: playwright 1.62.1, axe-core 4.14.0, lighthouse 13.5.0. Node ≥22. `"type":"module"`.
- **Build:** `scripts/build.mjs` reads hard-coded `data/event-2026.json` + `scripts/page.html`, fills `{{key}}` (unknown key throws; HTML-escaped except 6 markup keys), inlines event config as `<script id="event-config" type="application/json">`, writes committed root `index.html`. `--check` fails if stale. No hashing/minify. Shared rules in `assets/js/content.js` (`localAsset`, `registrationURL`, `approvedHouses`, `eventLabels`) are used by build, tests and browser — **reuse this pattern**.
- **Runtime JS:** `main.js` (mobile disclosure nav <959px, focus management), `houses.js` (relative `fetch('data/houses-2026.json')`, `textContent` rendering, search), `map.js` (static `<picture>` of 6000×8300 PNG; HEAD-checks file links; `#map-unavailable` fallback). DOM ids: `hero, what-to-expect, how-it-works, map, featured-houses, house-list, house-search, …`.
- **Data:** `data/event-2026.json` (date 2026-10-31, 18:00–21:00 confirmed Oct 9, `timeZone: America/New_York`, registration pending/null, canonical URL). `data/houses-2026.json`: 31 records `{id:"stop-NN", mapNumber, name, address, image:"assets/img/trail/*.webp", status:"approved", order}` — **no coordinates, no city/ZIP**.
- **CSS:** single `assets/css/styles.css` (13 KB). Tokens `--rb-bg #0b0e1d, --rb-surface #141828, --rb-elevated #1a1f3a, --rb-accent #ff7a1a, --rb-accent-hover #ff5a00, --rb-highlight #ffb54d, --rb-text #fff, --rb-muted #a8b0c0, --line #343b51, --radius 1.25rem`. Poppins 700 self-hosted woff2 + system-ui. Breakpoints 1600/1100/959/699/359; reduced-motion honored. 44 px min targets, 3 px amber focus ring.
- **Tests:** `node --test tests/content.test.mjs` (16 tests; hard-codes **31 houses**, date labels, forbids `2024|2025|google.com/maps|innerHTML|Swiper`). `tests/browser.mjs` (plain Playwright script, Chromium 9 viewports + WebKit 3; asserts 31 cards, **zero iframe/video**, no overflow, axe zero violations; requires dev server at `http://127.0.0.1:4173/redbird-parallax-site/`).
- **CI:** `.github/workflows/quality.yml` on PR/dispatch: check → unit → browser. **No deploy job**; Pages = legacy build from `main` `/`, `cname: null`, no `.nojekyll`. Whole repo is published (docs/, tests/, scripts/ included).
- **Perf baseline (Lighthouse mobile, local):** Perf 99 / A11y 100 / BP 100 / SEO 100; LCP 2.03 s; TBT 0; CLS 0; 440 KiB / 19 requests initial; ~717 KB fully scrolled.
- **PWA:** none (no manifest, SW, apple-touch-icon). Favicon 96×96.
- **Cruft:** 8 tracked 2025 `.ps1` scripts at root; ~33 MB unreferenced PNGs in `assets/img/icons/`; `hero_kids_map.jpg`, `redbird-center-night.jpg`, `halloween-night-map-bg.png`, 0-byte `google-maps-pin.png`. `gh-pages` branch = obsolete 2025 site (unused). Baseline tag `baseline/redbird-before-2026-20261009` exists.
- **Map credit:** footer credits Miami-Dade County GIS for organizer map geography (license not confirmed — do not reuse as data).
- **History:** commit `aac05c1` and earlier contain `data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv` with *household (family) names* + addresses (no email/phone). Low severity.

### 1.2 red-bird-halloween-trail (2025 Halloween) — **SECURITY FINDING**
- **Raw 2025 registration CSV with `Contact Email` and `Contact Phone Number` columns is committed on `main` and served publicly** (`Red_Bird_Trick-or-Treat_Trail_2025-10-15_20_02_34.csv` at root, plus `public/data/participants.csv` copy). `.gitignore` lists it but it was committed anyway. `data/participants.csv` publishes household names. → Remediation in §7 (gate G5).
- Google My Maps iframe (`mid=1ExTFwDBAKnengmkfMcVtjvAvi_MTw3s`) — retire. Manifest uses root-absolute paths (broken under project path). Useful only: palette tokens (`--rb-ember #F86B0A`, `--rb-cardinal #D91F08`, …), Web Share helper.

### 1.3 red-bird-holiday-trail (Christmas 2025)
- Vanilla HTML/CSS/JS, GitHub Pages legacy from main, **custom domain `redbird.iplcmiami.com`** (DNS at GoDaddy `domaincontrol.com`, CNAME → `pdarleyjr.github.io`; cert renews automatically).
- Palette: `--deep-green #0a3d2e, --midnight-blue #0d1b2a, --radiant-red #d62828, --metallic-gold #ffd700, --soft-gold #f4a261, --warm-white #fef9f3`. Fonts Poppins + Playfair Display.
- Art: `assets/images/red_bird_holiday_trail.png` (1536×1024, 3.1 MB — cardinal on a "Holiday Trail" sign) = **Christmas card art** (convert to WebP 600/960/1440). Also `gingerbreadhouse_new_large.jpg`, `fox_large.jpg`.
- PWA: manifest (`start_url`/`scope` `./`), icons mis-sized (1024 px declared 192/512). **Service worker `rbht-v4-20251217` is cache-first for same-origin** → if this domain is ever pointed at the new app, returning visitors' old SW will keep serving the 2025 site unless we publish a kill-switch at the same SW URL (`/service-worker.js`) — see §5.9.
- Reusable code: canvas snow (reduced-motion aware), carousel/lightbox, `--vh` fix. Leaflet loaded but unused. **Do not reuse:** Dec 20 2025 date, "First Annual", Santa stop, 2025 map, captions with addresses, `© 2025`.

### 1.4 map-icons
- 21 icons, 64×64 RGBA PNG (`icons/png/`), originals (~1 MB each) recoverable at commit `3cd82ff~1`. `out/houses_real.json` maps 2024 icon→address/name. **All KML coordinates are fake** (synthetic diagonal). No usable coordinates anywhere in the ecosystem.
- 2024 icons whose **address** matches a 2026 registration (candidate only — admin must confirm):
  - `blues-boooooo-house` ↔ [new #33 address] [new #33 name] (address + name match → strong candidate)
  - `the-webbed-manor` ↔ [new #40 address] [new #40 name] (address match, related name)
  - `sweet-and-spooky-stop` ↔ [new #36 address] [new #36 name] (address match, different name)
  - Already-published houses keep their organizer-PDF icons (`assets/img/trail/*.webp`); 2024 icons never override them.

### 1.5 Preservation requirements
Keep: build/check pattern, `content.js` validation, `textContent`-only rendering, axe/no-overflow browser checks, relative paths, the confirmed date/hours, all 31 approved records + their ids/numbers/icons, archival PNG/PDF (relabeled, §4.5). Do not touch `gh-pages` branch, the Christmas repo's content, or the dirty local checkout.

---

