# Decisions log (deviations from the spec docs and gate decisions)

| # | Date | Decision | Reason |
|---|---|---|---|
| D1 | 2026-10-16 | Tiles extracted with a Node script (`scripts/map/extract-tiles.mjs`, `pmtiles` npm reader over HTTP range requests) instead of the go-pmtiles CLI binary | Same output (z12–15, bbox per spec, static decompressed z/x/y.pbf), no executable download needed. 24 tiles, ~2 MB raw. |
| D2 | 2026-10-16 | Visited marker on the map = amber numeral and amber ring on a raised dot, not a ✓ glyph | MapLibre forbids `feature-state` in layout (`text-field`), and ✓ is outside the 0–255 glyph range we self-host. The directory and list still show a ✓ checkbox. |
| D3 | 2026-10-16 | House directory `<li>` is server-rendered; the snapshot is **not** inlined in the HTML | Keeps data-only changes from altering page code hashes; JS re-renders when a newer valid snapshot arrives. |
| D4 | 2026-10-16 | Legacy roster moved to `data/reconcile/roster-2026-10-09.json`; `data/houses-2026.json` removed | Single public data source is the snapshot; roster stays as reconciliation/seed input. |
| D5 | 2026-10-16 | Original-map "pending/Coming soon" empty state removed; only the superseded-map archive disclosure remains | The interactive map is the primary map now. Test rewritten (`a pending original map renders no download links`). |
| D6 | 2026-10-16 | Map-number DOM chips use cream fill, ink numerals and a cardinal ring (not cardinal fill) | Brand rule: no text on a red fill. Canvas markers follow §4.3 (cream numerals on cardinal), which is a graphic, not text. |
| D7 | 2026-10-16 | Wordmark is solid neon-red fill with a deeper-red stroke and glow, not hollow outline; power-on flicker animates `text-shadow`, never opacity | A transparent fill fails axe contrast; opacity animation produced transient contrast failures. |
| D8 | 2026-10-16 | Street labels in the print/night styles start at z13 (spec default z15) | Tile data stops at z15 and the print extent renders at ~z15, so default minor labels would be missing. |
| D9 | 2026-10-16 | Boundary shipped as the proposed rectangle; the owner approved it the same day (`status: approved`) | Needed for schema validation and print extent. |
| D10 | 2026-10-16 | Geocoded pins ship as `approximate`; #03 and #25 use the owner's pins (`verified`, `manual-owner`) | Census gave no match / wrong street for those two; the owner supplied coordinates (G2a). |

## Gate log
| Gate | Date | Status |
|---|---|---|
| G2a questions | 2026-10-16 | Sent to the owner via the orchestrating session; answered the same day (below). |
| G3 | 2026-10-16 | Pre-authorized by the owner ("until it is live"); used per milestone only after QA is green. |

| D11 | 2026-10-16 | Miami-Dade GIS address points not used for geocoding | No verified public endpoint with clear terms; US Census (street-checked) then Nominatim are used and every pin stays `approximate` until confirmed. |
| D12 | 2026-10-16 | Admin auth: Cloudflare Access (one-time PIN) plus the Worker's own Access JWT check (issuer, audience, signature, email allowlist). A password + cookie design was built and briefly deployed after an out-of-date instruction, then **reversed** the same day when the owner said 'Zero Trust is fine' and asked for a second admin address | Access supports several allowed emails with no password to store. Password login code, cookie code, secrets and the login_attempts table (migration 0004) were removed. |
| D13 | 2026-10-16 | Stop #10 icon is the Fluent jack-o-lantern, not the supplied pumpkin PNG | The supplied art showed candy characters, not a pumpkin, and did not match the brand set. |
| D14 | 2026-10-16 | The 2024 originals are clipped to their circle and placed on the brand badge | The source PNGs carry a baked-in checkerboard/white background. |
| D15 | 2026-10-16 | Review fixes applied before release: print/API/navigation routing in the service worker, in-place nearest-sheet updates, live snapshot applied to a loading map, import numbering that includes archived numbers, restore realigning map numbers, atomic optimistic-lock guard for edits, dev-server path blocklist on Windows | Findings from the security and code reviews. |

## Gate log additions
| Gate | Date | Status |
|---|---|---|
| G2a | 2026-10-16 | **Resolved** by the owner: #36 name as submitted; 2024 icons for #33/#40/#36; boundary approved; manual pins for #03 and #25 (verified, manual-owner); publish all 46. |
| G1 | 2026-10-16 | Cloudflare access provided as an API token (kept in the process environment only). Workers, D1 and the Access application deployed. |
| Admins | 2026-10-16 | Owner asked for a second admin address. Both addresses are in the Access policy and in the ADMIN_EMAILS Worker secret (emails are not stored in this repository). |

| D16 | 2026-10-16 | App markers use the processed transparent icon set from `tools/flyer-map/icons/` (no extra badge); #40 uses `fluent-spider-web` (the 2024 manor was unreadable at pin size); a test keeps the app's icons identical to the printed flyer's `ICONS` and checks alpha at every icon corner | Owner icon rule (no boxed backgrounds) and one icon per house across app and flyer. |
| D17 | 2026-10-16 | Pins come from `tools/flyer-map/houses.json` (OSM building centroids, owner GPS for #03/#25 = verified) and the flyer and app share them | Building-accurate; the map and printed flyer agree. |
| D18 | 2026-10-16 | The site moved to https://redbird.iplcmiami.com/ (G4 approved by the owner): Christmas repo released the domain, this repo took it; `service-worker.js` kill-switch ships at the site root for returning Christmas visitors | One domain, one PWA for every Red Bird event. Times in DELIVERY-REPORT section 10. |
| D19 | 2026-10-16 | Themed icon pins replace the numbered dots on the live map and the print page: a glossy disc with the house icon, a number tag, a needle and a ground dot (the flyer look). Both surfaces use one deterministic layout, `shared/pin-layout.mjs` (greedy ring search, not the spring relaxation first tried, which jammed on phones). Live pins are DOM markers, laid out only on moveend/zoomend/resize and kept clear of map controls; phones open about one zoom level in (Show whole trail still fits everything). Print badges are SVG with the same recipe; `shared/print-layout.mjs` is retired. | Owner asked for the flyer look instead of generic numbered circles; one layout keeps map and paper consistent and tested. |
| D20 | 2026-10-16 | Pin review fixes: needles are capped (28 px phone, 36 px desktop) and houses with no room within the cap group into a cluster badge (fanned icons, "+N", tap zooms in) computed inside `shared/pin-layout.mjs`, not with a MapLibre cluster source, so one tested layout serves the map and print; crossing needles swap heads; cluster heads may sit in any direction (heads of single houses stay above them); the dashed approximate rim is gone from pins ("Location approximate" lives in the house sheet and admin); the disc is lighter with a 92% icon and a 15 px number tag; phones open about x2.8 in (Show whole trail still fits everything). | Owner review of the phone view: crossing needles, unreadable icons, noisy rims. |
