# Red Bird Holiday Trails — UX/UI Specification

> Note: the 15 registrations not yet approved for publication (stops #32–#46) appear as `[new #N …]` placeholders until gate G2a. The full table is regenerated locally by `scripts/reconcile.mjs` from the private CSV and kept in the owner's local plan copy.

## 4. UX/UI specification (Deliverable 4)

### 4.1 Brand system — "Red Bird Neighborhood Holiday Trails"
- **Concept:** one night-sky neighborhood, a cardinal at the center, and a strand of string lights that carries both holidays (ember-orange bulbs on the Halloween side, gold bulbs on the Christmas side). Restrained, warm, legible outdoors at night.
- **Tokens** (`assets/css/tokens.css`; existing `--rb-*` names retained as aliases):
  - Shared: `--rb-night #0b0e1d` (bg), `--rb-surface #141828`, `--rb-elevated #1a1f3a`, `--rb-line #343b51`, `--rb-text #ffffff`, `--rb-muted #a8b0c0`, `--rb-cardinal #d62828` (brand primary), `--rb-cardinal-ink #ffd9d4`.
  - `[data-theme="halloween"]`: `--accent #ff7a1a`, `--accent-hover #ff5a00`, `--highlight #ffb54d`.
  - `[data-theme="christmas"]` (ready, unused until activation): `--accent #ffd700`, `--accent-hover #f4c400`, `--highlight #f4a261`, `--evergreen #0a3d2e`.
  - Type: Poppins 700 (existing woff2) for display; `system-ui` body; fluid scale `--step-0 clamp(1rem,.95rem+.25vw,1.125rem)` … `--step-5 clamp(2.25rem,1.6rem+3.2vw,4rem)`. Spacing `--space` existing; radii 1–1.25 rem; elevation via 1 px `--rb-line` + soft shadow, **no glassmorphism, no random gradients**.
- **Wordmark:** small letter-spaced "RED BIRD" (cardinal red) over "Neighborhood Holiday Trails" (Poppins 700, white). Cardinal mark = existing `assets/img/trail/cardinal.webp`. Lights strand = inline SVG (≤3 KB), bulbs twinkle with CSS opacity animation only when `prefers-reduced-motion: no-preference`.

### 4.2 Shared homepage `/`
- **Mobile (≤699 px):** header (cardinal + wordmark, no menu). Hero line: "Two neighborhood trails, one Red Bird." (≤1 line of supporting text). Two stacked cards, full container width, aspect 4:5 (≈ 340–400 px tall), 16 px gap:
  - **Halloween card** = one `<a href="halloween/">` (entire card is the target). Art: existing hero webp (600/960/1536) with dark bottom scrim; ember top border; eyebrow "Halloween"; title "Red Bird Trick-or-Treat Trail"; meta "Saturday, October 31, 2026 · 6–9 PM"; live count "46 houses on the map" (from snapshot; omitted if unknown); pill CTA "Explore the trail →". States: hover lift 2 px, focus 3 px amber ring, active scale .99.
  - **Christmas card** = `<article class="event-card is-updating" aria-labelledby=… aria-describedby=…>` (**not** a link, no button, no tabindex). Art: `red_bird_holiday_trail` webp, desaturated (`filter: saturate(.35) brightness(.7)`); gold ribbon badge text **"Updating for this year's event"**; title "Red Bird Neighborhood Holiday Trail"; body "Details for this year’s holiday trail will be posted here." Cursor default; no hover effect. Screen readers read title + "Updating for this year's event" (visually-hidden "Not yet available").
- **Desktop (≥960 px):** two-column grid, max 1200 px, cards aspect 5:6, Halloween left; the lights strand spans the top of both cards, bulb colors shifting ember→gold left→right.
- Below cards: "Add Red Bird Trails to your home screen" install affordance (§4.7), brief footer (neighborhood, © 2026, attribution link to /about-data anchor).
- **Activation rule:** card rendering comes from events registry status: `published` → link to `christmas/` (or `halloween/`) with full styling; `updating` → inactive card above; `archived` → card stays visible, links to the event page, badge "This year’s trail has ended"; `draft` → card hidden.

### 4.3 Halloween experience `/halloween/`
- Keeps existing sections and copy (hero, what to expect, how it works, houses, community) and theme; adds a **header "← Holiday Trails" link** to `../` (also first item in mobile menu).
- **Mobile action bar** (fixed bottom, safe-area padded, 64 px + inset): `Map` · `Near me` · `Houses` · `Print`. `Near me` scrolls to the map and starts location. Hidden on desktop (desktop nav has same items).
- **Map section `#map`:** on mobile the map is `height: calc(100svh - header - actionbar)`; desktop 640 px tall in a 2-column layout with a scrollable house list beside it (list ↔ map selection sync).
  - Before load: lightweight poster (pre-rendered basemap webp, ~60 KB) + spinner; MapLibre loads when `#map` is within 600 px of viewport, or immediately on any map control tap.
  - Floating controls (right, 48 px round, labeled): **Find my location** (primary, cardinal/ember fill), zoom +/−, "Show whole trail".
  - **Nearest house card** (bottom sheet, appears once location is active): big directional arrow, "Nearest: #12 Phantasmal Phountain", "About 240 ft · Northeast (straight-line)", buttons: `Show on map`, `Mark visited`, `Next nearest`, `Walking directions ↗`. Compass toggle "Point arrow using compass" (shows only where supported).
  - **Markers (overlap-aware):** houses are a GeoJSON source rendered by MapLibre layers, not 46 DOM elements — several stops are only 20–30 m apart (5785/5790/5792/5795 SW 39th St; 3601/3610 SW 60th Ave plus a new neighbor) and z16 ≈ 2.15 m/px. Layers: (1) `house-dot` circle (r 9 px z15 → 13 px z18, ember fill, white stroke; always drawn, `circle-sort-key = mapNumber`); (2) `house-number` symbol (number text in the dot, `text-allow-overlap: true` on the dot itself); (3) `house-icon` symbol (illustrated icon via `addImage`, 44 px, only at z ≥ 17.5, `icon-allow-overlap: false`, `symbol-sort-key = mapNumber`, collisions hide the icon but never the numbered dot). State via `feature-state`: selected (ember ring + raised), nearest (double ring; pulse only without reduced motion), visited (grey dot + ✓ text), approximate (dashed outer ring via second circle layer with lower opacity). Tap: `queryRenderedFeatures` with a 22 px hit box; if >1 feature hit, show a small chooser sheet listing those houses. The selected house additionally gets one DOM `<button>` marker for focus/announce. **Accessible equivalent:** the "Houses on the map" list (beside the map on desktop, a sheet on mobile) — every item is a button that selects/flies to the house; keyboard users operate the map through this list. Tap → house sheet (icon, number, name, address, description, Visited toggle, Directions).
  - User location: blue dot (#2b7fff, white 3 px border) + translucent accuracy circle; follow mode until the user pans.
  - Status messages via one `aria-live="polite"` region (permission denied, low accuracy, outside area, map offline).
- **Houses section:** existing searchable grid; each card gains "Show on map" and a Visited checkbox; header shows "7 of 46 visited · Reset".
- **Archival map:** removed from primary actions; a collapsed "Original October 9 map (31 houses — superseded)" disclosure keeps the PNG/PDF links with a visible "Out of date" label.

### 4.4 Interaction/permission copy (exact)
- Before prompt (first tap): "We use your location only on this device to show where you are. It’s never sent anywhere."
- Denied: "Location is off for this site. You can still browse the map and the house list. To turn it on, allow location for this site in your browser settings."
- Low accuracy (>75 m): "Your location is approximate (±{n} ft)."
- Outside area (>400 m from boundary): "You appear to be outside the Red Bird trail area."
- All visited: "You’ve visited every house on your list! 🎃" + `Reset visited`.

### 4.5 Print `/halloween/print/`
- Screen view: preview of the page + controls: Paper `Letter portrait` (default) / `Letter landscape`; "Include house list" (default on); `Print or save as PDF` button (disabled until "Map ready ✓"). Platform hint: iOS "Share → Print → Save to Files", Android "⋮ → Share → Print → Save as PDF".
- Printed page (Letter portrait): header band (white bg): "Red Bird Trick-or-Treat Trail" + "Saturday, October 31, 2026 · 6–9 PM". Map block 7.5×6.2 in: light basemap, readable street labels (≥7 pt equiv), numbered ember circles (0.22 in, white numerals 7 pt) with optional tiny icons, north arrow, scale bar (ft). Legend below in 3 columns (number, name, address; 7.5 pt), wraps to page 2 automatically if >60 houses. Footer: "Data version {v} · updated {date}", "Map data © OpenStreetMap contributors · Protomaps", site URL. No nav, no GPS dot, no admin UI. `@page { size: letter; margin: .4in }`, `print-color-adjust: exact`.

### 4.6 Admin (`redbird-admin` host)
- Same tokens, light-on-dark compact layout, desktop-first but usable on a phone.
- **Manage Houses:** stat chips (Published 46 · Drafts 0 · Needs review 6 · Approximate pins 46); search; table/list: #, icon, name, address, location status, publication status, `Edit`. Filter chips: All / Needs review / Drafts / Archived.
- **House editor (Add/Edit):** steps in one page — Details (name, address, optional description ≤280 chars) → Location (map with draggable pin; `Suggest from address` → geocode; "Pin is on the correct house front" checkbox ⇒ `verified`) → Icon (grid: custom icons first, then generic; preview at both marker sizes) → Preview (public card + marker) → `Save draft` / `Publish` / `Unpublish` / `Archive`. Saving a published house shows "This updates the public map immediately."
- **Import:** drop CSV → client parse → header-mapping confirmation (shows which columns will be *ignored* as private) → preview table grouped: New · Name changes · Duplicates/conflicts · Incomplete · Unchanged; per-row Accept/Reject; `Apply accepted (n)`; batch history with `Undo batch`.
- **Versions:** list of published snapshots (version, time, actor, house count, diff summary) with `Restore`.
- **Events:** Halloween 2026 / Christmas 2026 status selector (draft · updating · published · archived) with confirmation dialog; Christmas details form (title, date, hours, description, art choice) required before `published` is allowed.
- **Activity:** last 100 audit entries.

### 4.7 PWA install UI
- Android/Chromium: capture `beforeinstallprompt`; show `Install app` button (footer + Halloween menu); call `prompt()` on tap; hide when installed (`appinstalled`, `display-mode: standalone`).
- iOS Safari (not standalone): `Add to Home Screen` button opens a small sheet: "1. Tap Share ⬆︎ 2. Tap Add to Home Screen 3. Keep ‘Open as Web App’ on." Never auto-pop; dismissal stored 14 days.
- Update toast (bottom, above action bar): "A new version of Red Bird Trails is ready. [Refresh]" — never auto-reload; deferred while location tracking is active until the user stops it or taps Refresh.

### 4.8 Accessibility (WCAG 2.2 AA)
Skip link; landmarks; visible focus; all controls ≥44 px (primary ≥48); contrast ≥4.5:1 text (ember `#ff7a1a` on `#0b0e1d` = 7.0:1 ✓; card text over art uses scrim to keep ≥4.5:1); map markers are focusable buttons with full labels; keyboard: arrow keys pan, +/- zoom (MapLibre built-in), Tab through markers in number order; status via `aria-live`; inactive Christmas card is non-interactive text with explicit "not yet available"; reduced motion disables twinkle, pulse, fly-to animation (jump instead).

---

