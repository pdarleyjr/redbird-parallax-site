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
| D9 | 2026-10-16 | Boundary shipped as the proposed rectangle, flagged `status: proposed` | Needed for schema validation and print extent; owner approval pending (G2a). |
| D10 | 2026-10-16 | The 29 geocoded published houses ship as `location: approximate`; #03 and #25 ship as `none` | Census gave no match / wrong street. Owner placement pending (G2a). |

## Gate log
| Gate | Date | Status |
|---|---|---|
| G2a questions | 2026-10-16 | Sent to the owner via the orchestrating session. Awaiting answers. |
| G1 Cloudflare steps | 2026-10-16 | Sent. Awaiting `wrangler login` + Access team name + admin email. |
| G3 | 2026-10-16 | Pre-authorized by the owner ("until it is live"); used per milestone only after QA is green. |
