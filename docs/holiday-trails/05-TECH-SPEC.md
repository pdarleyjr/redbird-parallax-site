# Red Bird Holiday Trails — Technical Specification

> Note: the 15 registrations not yet approved for publication (stops #32–#46) appear as `[new #N …]` placeholders until gate G2a. The full table is regenerated locally by `scripts/reconcile.mjs` from the private CSV and kept in the owner's local plan copy.

## 5. Technical specification (Deliverable 5)

### 5.1 Repository structure (target)
```
index.html                    # GENERATED holiday homepage
halloween/index.html          # GENERATED (template: templates/halloween.html — evolved from scripts/page.html)
halloween/print/index.html    # GENERATED
christmas/index.html          # GENERATED: shell; shows "Updating" unless live status = published
404.html  offline.html  manifest.webmanifest  sw.js (GENERATED, version injected)  .nojekyll
service-worker.js             # ONLY if G4 domain move: kill-switch for the 2025 Christmas SW
data/
  site.json                   # events registry (static fallback for homepage cards) + api.publicBase
  events/halloween-2026.json  # moved from data/event-2026.json (keep old file until tests migrate, then delete)
  halloween-2026.public.json  # published snapshot fallback (schema §5.4)
  icons.json                  # icon catalog
  geo/redbird-boundary.geojson
  houses-2026.json            # legacy; deleted after snapshot adoption (tests updated)
  reconcile/2026-10-16.decisions.json  # public-safe decisions (addresses/names/ids only) — committed after G2
assets/
  css/tokens.css base.css home.css halloween.css map.css print.css   (styles.css split; keep size small)
  js/content.js (extended)  data.js  home.js  halloween.js (was main.js)  houses.js  pwa.js
  js/map/loader.js  map-view.js  markers.js  geo.js  nearest.js  locate.js  compass.js  visited.js
  js/print/print.js  projection.js
  vendor/maplibre-gl-6.14.0/{maplibre-gl.mjs, maplibre-gl-worker.mjs, maplibre-gl.css, LICENSE.txt}
  map/style-night.json  style-print.json  tiles/{z}/{x}/{y}.pbf  fonts/{stack}/0-255.pbf
  map/print-base-{letter-portrait,letter-landscape,tabloid}.webp + print-base.json (bbox, px size, zoom)
  map/poster.webp
  img/markers/*.webp          # 128×128 marker icons (from trail/*.webp + generics + confirmed 2024 originals)
  app/icon.svg icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png screenshot-narrow.png screenshot-wide.png
shared/                       # imported by build scripts, browser, admin UI and Workers (no DOM, no Node APIs)
  address.mjs  names.mjs  csv.mjs  reconcile.mjs  geo.mjs  snapshot-schema.mjs  numbering.mjs
scripts/
  build.mjs (multi-page)  serve.mjs (base prefix via BASE env, add .webmanifest/.pbf MIME)
  reconcile.mjs               # CLI: --csv <path> → private/ report + data/reconcile/*.decisions.json draft
  make-snapshot.mjs           # decisions + geocodes → data/halloween-2026.public.json (Milestone 1 path)
  map/extract-tiles.mjs map/build-style.mjs map/render-print-base.mjs  assets/make-icons.mjs
  snapshot-pull.mjs           # used by snapshot.yml
templates/ home.html halloween.html print.html christmas.html 404.html offline.html
worker/
  package.json  wrangler.jsonc (env.public + env.admin, one shared D1 binding)  migrations/0001_init.sql
  src/public.js admin.js  lib/{auth.js,db.js,snapshot.js,validate.js,geocode.js,imports.js,http.js}
  admin-ui/ index.html admin.js admin.css  (build copies vendor/map/shared into admin-ui/dist)
  test/*.test.js (vitest + @cloudflare/vitest-pool-workers)
tests/ unit/*.test.mjs  e2e/*.spec.mjs (@playwright/test)  fixtures/  playwright.config.mjs
private/                      # .gitignore'd: raw CSVs, private reconciliation reports
.github/workflows/quality.yml (extended)  snapshot.yml (G6)  worker-ci.yml
```
Remove in the same PR (reviewable, recoverable from tag): root `*.ps1`, `assets/img/icons/*` (33 MB unreferenced), unreferenced 2025 media listed in §1.1, stale `DEPLOYMENT_CHECKLIST.md`/`PROJECT_SUMMARY.md` (replace with docs links).

### 5.2 Routes & URLs (base-path agnostic)
| Path (relative to base) | Purpose |
|---|---|
| `./` | holiday homepage (manifest start_url `./?source=pwa`) |
| `halloween/` (`#map`, `#featured-houses`, `#house-<id>`) | Halloween; `#house-stop-12` opens that house on the map |
| `halloween/print/?paper=letter-portrait&list=1` | print page |
| `christmas/` | reserved; "Updating" until published |
| `404.html` | links to home/halloween |
- Every href/src is relative; build computes `{{root}}` prefix per page depth (`./`, `../`, `../../`). No leading `/` anywhere (unit test greps generated HTML/CSS/JS).
- **Legacy compatibility:** tiny external `assets/js/legacy-redirect.js` loaded first in the homepage `<head>` (before paint): if `location.hash` ∈ the set of element ids in the generated Halloween page (the build writes this list into the script, so it can't drift; today: `#hero, #what-to-expect, #how-it-works, #map, #featured-houses, #house-list, #house-search, …`) → `location.replace('halloween/' + location.search + hash)`. Old QR/bookmarks to the root land on the homepage with Halloween as the first, largest card. Old direct asset links (`assets/maps/redbird-trail-2026.png/pdf`) keep working.
- Canonical: `site.json.origin` + page path; og tags per page.
- Meta CSP per page: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:; connect-src 'self' <api.publicBase>; base-uri 'none'; form-action 'none'` (inline legacy-redirect script moved to an external tiny file or hashed).

### 5.3 D1 schema (`worker/migrations/0001_init.sql`)
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,                       -- 'halloween-2026', 'christmas-2026'
  kind TEXT NOT NULL CHECK (kind IN ('halloween','christmas')),
  year INTEGER NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','updating','published','archived')),
  date TEXT, start_time TEXT, end_time TEXT, time_zone TEXT NOT NULL DEFAULT 'America/New_York',
  details_json TEXT NOT NULL DEFAULT '{}',   -- public copy: description, card art key, hours source
  boundary_geojson TEXT, print_extent_json TEXT, trail_geojson TEXT,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL);
CREATE TABLE houses (
  id TEXT PRIMARY KEY,                       -- 'stop-01'…; never reused, never renamed
  event_id TEXT NOT NULL REFERENCES events(id),
  map_number INTEGER NOT NULL CHECK (map_number > 0),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  address_display TEXT NOT NULL, address_key TEXT NOT NULL,
  description TEXT CHECK (description IS NULL OR length(description) <= 280),
  icon TEXT NOT NULL,                        -- key in icons.json
  lat REAL, lng REAL,
  location_status TEXT NOT NULL CHECK (location_status IN ('none','suggested','verified')),
  location_source TEXT,                      -- 'census','miami-dade','nominatim','manual'
  status TEXT NOT NULL CHECK (status IN ('draft','review','published','archived')),
  version INTEGER NOT NULL DEFAULT 1,        -- optimistic concurrency
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL);
CREATE UNIQUE INDEX houses_number ON houses(event_id, map_number);        -- numbers stay reserved even when archived
CREATE UNIQUE INDEX houses_address ON houses(event_id, address_key) WHERE status <> 'archived';
CREATE TABLE house_flags (house_id TEXT NOT NULL REFERENCES houses(id), code TEXT NOT NULL,
  detail TEXT, created_at TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT,
  PRIMARY KEY (house_id, code, created_at));
CREATE TABLE import_batches (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, file_sha256 TEXT NOT NULL,
  row_count INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('previewed','applied','rolled_back')),
  summary_json TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL);
CREATE TABLE import_rows (batch_id TEXT NOT NULL REFERENCES import_batches(id), row_index INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,                 -- sha256(eventId|submittedOn|addressKey|normalizedName)
  submitted_on TEXT, address_raw TEXT, house_name_raw TEXT,   -- NO person names, emails, phones
  classification TEXT NOT NULL, target_house_id TEXT,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','accepted','rejected','skipped_known')),
  PRIMARY KEY (batch_id, row_index));
CREATE INDEX import_rows_fp ON import_rows(fingerprint);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor TEXT NOT NULL,
  action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, before_json TEXT, after_json TEXT, batch_id TEXT);
CREATE TABLE snapshots (event_id TEXT NOT NULL, version INTEGER NOT NULL, created_at TEXT NOT NULL,
  created_by TEXT NOT NULL, payload_json TEXT NOT NULL, etag TEXT NOT NULL, PRIMARY KEY (event_id, version));
```
Seed: `worker/migrations/0002_seed_2026.sql` **generated** by `scripts/make-snapshot.mjs --emit-sql` from the approved decisions file (no PII). Applied to production only at gate G2.

### 5.4 Public snapshot contract (`shared/snapshot-schema.mjs`, validated on write, on read, and in tests)
```json
{ "schema": 1, "eventId": "halloween-2026", "version": 7, "publishedAt": "2026-10-20T14:03:00Z",
  "event": { "name": "Red Bird Trick-or-Treat Trail", "year": 2026, "date": "2026-10-31",
             "start": "18:00", "end": "21:00", "timeZone": "America/New_York", "status": "published" },
  "boundary": { "type": "Polygon", "coordinates": [[[-80.30,25.733],[...]]] },
  "printExtent": [-80.3008, 25.7326, -80.2852, 25.7396],
  "trail": null,
  "houses": [ { "id": "stop-01", "mapNumber": 1, "name": "Skeleton Dog", "address": "3911 SW 60th Court",
                "description": null, "icon": "skeleton-dog", "lat": 25.734809, "lng": -80.292223,
                "location": "approximate" } ] }
```
Rules: only `status='published'` houses are included. `location` is `"verified"` | `"approximate"` (suggested) | `"none"` (lat/lng null — listed in directory/print legend with "Map location coming soon", no marker, excluded from nearest). Non-null coordinates must be inside boundary (+50 m tolerance). **Versions only increase**: every publish/restore inserts `max(version)+1`; restore copies an old payload into a new version; the first D1 snapshot = bundled file version + 1. Clients render the higher version (live API payload is unwrapped from `{ok,data}` before schema validation); unique ids & numbers; sorted by `mapNumber`; names/addresses pass existing `content.js` sanitation; no other fields allowed (schema rejects extras ⇒ prevents PII leakage). Events list contract: `[{id, kind, year, slug, title, status, date, start, end, card:{art, blurb}}]` (only `draft` omitted; `archived` included so the card can say "ended").
- **Directions links** live only in `shared/directions.mjs` (the content test's `google.com/maps` ban is narrowed to "no other file"): iOS/macOS → `https://maps.apple.com/?daddr={lat},{lng}&dirflg=w`; others → `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=walking`. Destination only — never the visitor's origin. Opened with `target="_blank" rel="noopener"`, preceded by the note "Opens your maps app. Check that the route is safe to walk."

### 5.5 APIs
**redbird-public** (GET/HEAD/OPTIONS only; `Access-Control-Allow-Origin: *`; no cookies; JSON envelope `{ok, data, error}`):
- `GET /v1/events` · `GET /v1/events/:id/public` (latest snapshot payload; `ETag`, `If-None-Match` → 304; `Cache-Control: public, max-age=30, stale-while-revalidate=300`; Cache API keyed by event+version) · `GET /v1/health`.
- Rate limit: Workers Rate Limiting binding 120 req/min/IP if available on the account; otherwise rely on cache (document).

**redbird-admin** (entire hostname behind Access; every `/api/*` request: verify JWT (`jose.createRemoteJWKSet(https://<team>.cloudflareaccess.com/cdn-cgi/access/certs)`, `issuer`, `audience=ACCESS_AUD`) + email ∈ `ADMIN_EMAILS`; mutating requests also require `Origin` = own origin and `Content-Type: application/json`; 401/403 fail-closed):
- `GET /api/me`
- `GET /api/houses?event=&status=` · `GET /api/houses/:id` · `POST /api/houses` · `PATCH /api/houses/:id` (requires `If-Match: <version>`, 409 on conflict) · `POST /api/houses/:id/{publish|unpublish|archive|restore}` · `POST /api/houses/renumber {eventId, order:[ids]}` (explicit, audited)
- `POST /api/geocode {address}` → `{suggestions:[{lat,lng,source,matched}], inBoundary}` (1 rps throttle per isolate + cache)
- `POST /api/imports/preview {eventId, fileSha256, rows:[{rowIndex, submittedOn, address, houseName}]}` → classified rows
- `POST /api/imports/:batchId/apply {decisions:[{rowIndex, decision, override?:{name?, targetHouseId?}}]}` · `POST /api/imports/:batchId/rollback`
- `GET /api/snapshots?event=` · `POST /api/snapshots/:event/:version/restore`
- `GET|PATCH /api/events/:id` (status changes validated: `published` requires date, title, description)
- `GET /api/audit?limit=100` · `GET /api/export.csv?event=` (public fields + status + coords only)
- Every mutation: read current rows + `max(version)` → apply change in memory → build snapshot with `lib/snapshot.js` and validate with the shared schema → one `db.batch([...])` (single transaction) containing row change + audit row + `INSERT INTO snapshots … version = expected+1`. A primary-key conflict on the snapshot (concurrent edit) aborts the whole batch → 409 "Please retry". The public Worker reads the latest snapshot row per request (1 row read) and returns it with a strong `ETag` (`"<eventId>-<version>"`) and `Cache-Control: public, max-age=30`; no Cache API (unneeded at this traffic).
- **Import semantics:** accepted *new* rows create houses with `status='review'`, `location_status='suggested'` (after geocode) — never auto-published. Accepted *name changes* to published houses are applied only with the per-row override and create a snapshot. Rollback of a batch: hard-deletes houses created by that batch (freeing their numbers) and reverts updated fields from `audit_log.before_json`; refused (409, with list) if any of those houses were edited after the batch.
- **Renumber:** assigns numbers to all houses of the event (non-archived in the given order 1..n, archived after them), in two passes inside one batch (`map_number = -map_number`, then final values) to avoid unique-index collisions.

### 5.6 Algorithms
- **Address normalization (`shared/address.mjs`)**: trim, collapse whitespace, strip trailing `, USA`, city (`Miami`), state (`FL`/`Florida`), and ZIP (captured separately); remove periods; `Southwest|S\.?W\.?` → `SW`; `South` before street name → `S`; numeric street → ordinal (`59`→`59th`, `61`→`61st`, `62`→`62nd`, `63`→`63rd`, 11–13 → `th`); suffix map `St|Street→Street, Ave|Av|Avenue→Avenue, Ct|Court→Court, Pl|Place→Place, Dr|Drive→Drive, Ter|Terrace→Terrace, Ln|Lane→Lane`. Output `display` ("3800 SW 58th Avenue", title case, matches published style) and `key` ("3800|SW|58TH|AVENUE"). Warnings: `zip_mismatch` (ZIP present ≠ 33155), `unparsed` (no leading house number or unknown suffix). Unit tests cover every variant in the Oct 16 CSV (shape examples: "1234 Southwest 60th Place, Miami, FL, USA", "1234 SW. 35th St.", "1234 Sw 59 Avenue", "6212 South Waterway Drive", "1234 sw 60 pl"; the real fixture uses the CSV strings).
- **Name comparison (`shared/names.mjs`)**: NFKC; strip `\p{Extended_Pictographic}` and variation selectors; curly→straight quotes for comparison only; collapse whitespace; casefold. Equal ⇒ `cosmetic`; else `name_changed`. Public display keeps the stored (published) form. Similar-name warning: normalized Levenshtein ≤ 0.25 or equal after removing leading "The".
- **Reconciliation (`shared/reconcile.mjs`, used by CLI and Worker)**: group rows by `address.key`; per group pick latest by `submittedOn` (ties: lower original row index = newer, since export is newest-first); classes: `unchanged | cosmetic | name_changed | new | duplicate_same | duplicate_conflict | incomplete_name | incomplete_address | unparsed_address | known_fingerprint`. **Never auto-overwrite a published name; never delete/unpublish on absence** (absent published houses are reported as `not_in_export`, informational). Conflicts and incompletes create `house_flags`. Idempotency: fingerprint seen before ⇒ `known_fingerprint` (skipped), file hash seen before ⇒ banner "This file was already imported on …".
- **Numbering (`shared/numbering.mjs`)**: new house → `map_number = max(all numbers in event, incl. archived) + 1`; `id = 'stop-' + pad2(map_number)` at creation and never changes afterwards (even if renumbered). Archive keeps number reserved; restore reuses it. Renumber = explicit admin action, validates permutation 1..n contiguous for non-archived houses, audited, creates snapshot.
- **Coordinate validation**: finite, lat ∈ [25.70, 25.77], lng ∈ [−80.33, −80.26] (coarse), then point-in-polygon of boundary buffered 50 m (ray casting on the polygon; buffer by distance-to-edge check). `verified` only via explicit admin confirmation.
- **Distance/bearing (`shared/geo.mjs`)**: haversine with R = 6 371 008.8 m; initial bearing θ = atan2(sin Δλ·cos φ₂, cos φ₁·sin φ₂ − sin φ₁·cos φ₂·cos Δλ), normalized 0–360; 8-point compass labels. Display feet if < 0.1 mi (round to 10 ft), else miles to 0.1. Always labeled "straight-line". Unit tests with known pairs (e.g. #03 ↔ #04 hand-computed values, antimeridian-safe normalization).
- **Nearest**: candidates = snapshot houses − visited (unless "include visited") ; O(n) scan; ties → lower map number; recompute on each position update (throttled 1 s) and on visited change; "Next nearest" cycles the sorted list.
- **Walking-graph evaluation:** not in v1. The neighborhood is a near-regular grid with a waterway; straight-line ranking matches walking order in nearly all cases, and there's no verified sidewalk/crossing data to build a safe graph. Future option: once an admin draws a verified `trail` LineString network, compute shortest path with Dijkstra over ≤200 nodes client-side (≈2 KB code). Documented, not built.
- **Compass**: on toggle tap call `DeviceOrientationEvent.requestPermission?.()` synchronously in the handler (iOS); heading = `e.webkitCompassHeading` (iOS) or `360 − e.alpha` from `deviceorientationabsolute` (Chromium), then add `screen.orientation?.angle ?? 0`; low-pass filter on the unit circle (α = 0.2, avoids 359→0 jumps); arrow rotation = bearing − heading; if no heading in 3 s → revert to north-up arrow with "N" reference. Basic nearest works without it.
- **Visited**: `localStorage['rbht:visited:halloween-2026']` = JSON array of ids, wrapped in try/catch (private mode); unknown ids pruned on load; never sent to network.

### 5.7 Map implementation notes
- `loader.js`: dynamic `import()` of `assets/vendor/maplibre-gl-6.14.0/maplibre-gl.mjs` (resolved with `new URL(..., import.meta.url)`), inject CSS link once. v6.14 is ESM-only and locates `maplibre-gl-worker.mjs` next to itself via `import.meta.url`, starting it as a module worker through a blob shim — keep both files together with their original names; no worker-URL call needed; CSP must keep `worker-src 'self' blob:` (E2E loads the map with the CSP meta enforced).
- Tiles: style source declares `minzoom: 12, maxzoom: 15` (MapLibre overzooms to 19, no 404s). Extract **z12–15 only** with the go-pmtiles CLI (`pmtiles extract <daily build URL> out.pmtiles --bbox=… --minzoom=12 --maxzoom=15`), then explode to `{z}/{x}/{y}.pbf` (decompressed) with a small Node script using the `pmtiles` npm reader. Tile bbox = `maxBounds` plus one phone viewport (≈ −80.3120,25.7250 to −80.2740,25.7470) so edges never show blank. After building the style, a test asserts every `text-font` stack has a glyph folder (Protomaps uses Noto Sans Regular/Medium/**Italic**) and no `icon-image` remains (else self-host the official light/dark sprite). WebGL2 check (`document.createElement('canvas').getContext('webgl2')`) — if absent: show poster image + markers drawn as SVG via `print/projection.js` (static, tappable list sync) + notice "Interactive map isn’t supported on this device".
- Style URLs inside `style-*.json` are relative placeholders; `map-view.js` rewrites `sources.protomaps.tiles[0]`, `glyphs` to absolute URLs from `new URL('assets/map/…', document.baseURI)` before `new Map({style})`.
- Options: `maxBounds` = boundary bbox padded ~800 m, `minZoom 14`, `maxZoom 19`, `fitBounds(boundary, {padding: 24})`, `attributionControl: {compact: true, customAttribution: '© OpenStreetMap contributors · Protomaps'}`, `cooperativeGestures: false` on the dedicated mobile map viewport (it’s full-height, so page scroll isn’t trapped; desktop uses ctrl/⌘-scroll to avoid scroll-jacking).
- Boundary drawn as a subtle dashed ember line; optional trail layer when `trail` exists.
- Data refresh: `data.js` emits `snapshot:updated`; markers/list update in place without moving the camera.

### 5.8 Print implementation
- Paper formats: **Letter portrait** (default) and **Letter landscape** only.
- `scripts/map/render-print-base.mjs` (Playwright Chromium launched with `--use-angle=swiftshader --enable-unsafe-swiftshader`; run locally or in CI only when extent/style changes; output committed): page with MapLibre + `style-print.json`, fixed CSS size of the map block at `deviceScaleFactor` for 300 dpi (Letter portrait 7.5×6.2 in → 2250×1860 px), `fitBounds(printExtent, {padding:0, bearing:0})`, wait `idle` + `document.fonts.ready`, capture with `locator.screenshot()` (no `toDataURL`, so no `canvasContextAttributes.preserveDrawingBuffer` needed). Then record the **actual** rendered `map.getBounds()`, zoom and pixel size (the extent's aspect ≠ the block's) into `print-base.json` `{bounds, width, height, zoom, styleHash, extentHash}`. The same script renders `assets/map/poster.webp` (screen fallback/poster) with its own metadata.
- `print/projection.js`: Web-Mercator projection of lng/lat into the **recorded bounds** (x = (λ−λ_w)/(λ_e−λ_w)·W; y = (merc(φ_n)−merc(φ))/(merc(φ_n)−merc(φ_s))·H with merc(φ)=ln tan(π/4+φ/2)). Overlay SVG: numbered circles (0.2 in) — deterministic de-overlap: process houses by mapNumber, if a circle would intersect a placed one, offset it along 8 candidate directions at 1.2× diameter and draw a 0.5 pt leader line to the true point (unit test: no two circles intersect for the 46-house fixture). North arrow, scale bar (ft) from meters-per-pixel at center latitude.
- `print.js`: loads snapshot via `data.js`; if `extentHash(printExtent) ≠ print-base.json.extentHash` → show "The print map is being updated — please check back soon" (no live-render fallback; admin cannot change the boundary without a developer re-render, documented in ADMIN-SETUP). Print button enabled only after the base image `decode()` resolves and the overlay is drawn.
- Houses with coordinates outside the print extent ⇒ admin validation error (cannot publish).

### 5.9 PWA / service worker
- `manifest.webmanifest`: `{"id":"./","name":"Red Bird Neighborhood Holiday Trails","short_name":"Red Bird Trails","start_url":"./?source=pwa","scope":"./","display":"standalone","orientation":"any","background_color":"#0b0e1d","theme_color":"#0b0e1d","icons":[192 any, 512 any, 512 maskable],"screenshots":[narrow 1080×1920, wide 1920×1080]}`. `<link rel="manifest" href="{{root}}manifest.webmanifest">`, `<link rel="apple-touch-icon" href="{{root}}assets/app/apple-touch-icon.png">` (180×180, opaque), `<meta name="theme-color" content="#0b0e1d">`, viewport `width=device-width, initial-scale=1, viewport-fit=cover`.
- App icon: cardinal silhouette on night-blue rounded square with a small ember pumpkin and gold star sparkle; master SVG → PNGs via `sharp` (new devDep) in `scripts/assets/make-icons.mjs`; maskable has 20% safe padding.
- `sw.js` registered with `navigator.serviceWorker.register('{{root}}sw.js', {scope: '{{root}}'})`. Caches: `rbht-shell-<ver>`, `rbht-map-<maphash>`, `rbht-data`.
  - install: precache shell (all generated pages, offline.html, CSS, JS, fonts, app icons, icons.json, marker icons, site.json, bundled snapshot). No `skipWaiting` on install.
  - activate: delete `rbht-*` caches not current; `clients.claim()`.
  - fetch (GET only; ignore other origins except `api.publicBase`):
    - navigations: network-first, 3 s timeout → cached page → `offline.html`.
    - `*.public.json` and `api.publicBase/v1/*`: network-first 4 s → `rbht-data` → precached bundled snapshot. Store successful responses.
    - `assets/map/**`: cache-first (`rbht-map-*`); on first map open `loader.js` posts `{type:'warm-map'}` and the SW fetches the full tile/glyph/style manifest (`assets/map/manifest.json`, generated) so the neighborhood works offline thereafter.
    - other same-origin assets: cache-first (precache, versioned via `?v=<hash>` added by build).
  - message `SKIP_WAITING` → `skipWaiting()`; page reloads once on `controllerchange` only after the user tapped Refresh.
- Offline UX: banner "You’re offline — showing houses saved on {date}". Map shows from map cache if warmed, else poster + list.
- **If G4 (domain move) is approved:** add root `service-worker.js` kill-switch: on install `skipWaiting`; on activate delete all caches matching `/^red-bird-holiday-trail-/` (the 2025 SW names its cache `red-bird-holiday-trail-rbht-v4-20251217` — verified), `self.registration.unregister()`, then `clients.matchAll({type:'window'}).forEach(c => c.navigate(c.url))`. Keep it ≥60 days.
- **SW rollback stub:** `scripts/sw-rollback.mjs` writes a `sw.js` that deletes all `rbht-*` caches and unregisters itself. A rollback **replaces** `sw.js` with this stub — never delete `sw.js` (a 404 leaves the installed SW running). Covered by an E2E test.
- SW version hash covers app code/assets only, **not** `data/*.public.json` or the server-rendered directory text, so data-only commits never trigger the update toast; the bundled snapshot is fetched network-first anyway.

### 5.10 Build changes (`scripts/build.mjs`)
- Inputs: `data/site.json`, `data/events/*.json`, `data/halloween-2026.public.json`, templates. Outputs: all generated pages + `sw.js` + `assets/map/manifest.json`. `--check` compares all outputs.
- Precache list + version = sha256 over file contents (sorted) → `const VERSION='…'` in `sw.js`; asset URLs get `?v=<8-char hash>`.
- Static HTML is fully useful without JS: homepage cards from `site.json`; Halloween directory server-rendered from the bundled snapshot (progressive enhancement; JS re-renders when live data newer). This also keeps Lighthouse/LCP strong.

### 5.11 Milestone-1 data path (before the backend exists)
`node scripts/reconcile.mjs --csv "<path>"` → `private/reconcile-2026-10-16.md` (may contain nothing private beyond what's in the CSV, still gitignored) + draft `data/reconcile/2026-10-16.decisions.json` (ids, numbers, addresses, names, icons, flags — public-safe). Admin decisions from §2.4 are recorded there. `node scripts/make-snapshot.mjs` geocodes (Census, cached into `data/reconcile/geocode-cache.json`), applies manual coordinates for #03/#25 (owner-provided, or placed by the owner with a temporary pin-placement page kept in gitignored `private/tools/` and served only by `npm run dev -- --tools`; never committed, never deployed), emits `data/halloween-2026.public.json` (`location: "approximate"` until verified) and the D1 seed SQL. The same decisions file seeds D1 at G2, so lineage is single-source.

### 5.12 Error handling summary
Public: data fetch fail → bundled snapshot + "showing saved list"; schema-invalid live data → ignored + console error, bundled used; map lib/tiles fail → poster + list; geolocation errors (1 denied / 2 unavailable / 3 timeout) → mapped messages §4.4; storage blocked → visited works in-memory with notice. Admin: every API error shows the server `error.message` (user-friendly) and keeps form state; 409 → "Someone else changed this house. Reload to see the latest." Worker logs structured JSON (`console.log({level, route, actor, err})`), never logs request bodies of imports.

### 5.13 Christmas readiness
Events registry already contains `christmas-2026` (`status: "updating"`). `christmas/index.html` is an event shell using `[data-theme="christmas"]`: when live events say `published`, it renders title/date/hours/description/art from the events API and (later) its own houses using the same map modules (event-scoped snapshot `/v1/events/christmas-2026/public`). Activation = admin Events screen → `published` (+ snapshot workflow refreshes `site.json` fallback). No 2025 content is copied except approved art. Old Christmas repo untouched (archive note only after G4).

---


## 8. Implementation stages & parallelism

| Stage | Content | Depends on | Parallel? |
|---|---|---|---|
| A Foundation | worktree/branch, tag, cruft removal, tokens.css split, multi-page build + `{{root}}`, serve.mjs BASE, `.nojekyll`, @playwright/test migration of existing checks | — | first, solo |
| B Data | `shared/*` (address, names, csv, reconcile, numbering, geo, snapshot-schema) + unit tests; reconcile CLI; decisions file; geocode; bundled snapshot | A | B1 (shared libs) can start in parallel with C after A |
| C Homepage | home template/CSS, cards from site.json, legacy redirect, christmas shell, 404/offline | A | parallel with B |
| D Map | tiles/style/glyph pipeline, marker icons, loader, map-view, markers, locate, nearest, compass, visited, directory sync | B (snapshot contract), A | D-pipeline (tiles/icons scripts) parallel with B |
| F Print | print-base renderer, projection, print page | D-pipeline + B | after D-pipeline |
| G PWA | manifest, icons, sw.js, pwa.js install/update UI | A, C (pages exist) | parallel with D/F |
| E Admin | worker scaffold, migrations, auth, APIs, admin UI, import, versions, events | B (shared libs + schema) | parallel with D/F/G (separate `worker/` tree); deploy at G1/G2 |
| H Verify | full CI, Lighthouse, visual QA screenshots in `docs/qa/2026-holiday-trails/`, security review (security-reviewer agent), real-device checklist, deployment | all | last |
Independent Sonnet sessions that don't collide: (1) Worker/admin (`worker/**` only), (2) map tile/style/icon asset pipeline (`scripts/map/**`, `scripts/assets/**`, `assets/map/**`, `assets/img/markers/**`), (3) homepage + PWA (`templates/home.html`, `christmas.html`, `assets/css/home.css`, `assets/js/home.js`, `pwa.js`, manifest, app icons) — each after Stage A + `shared/` are merged into the feature branch. The main session owns `scripts/build.mjs`, `shared/`, Halloween template, map runtime, print, tests config.

---

