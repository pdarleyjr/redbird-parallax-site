## Trail map flyer, building-snapped pins, icon set, Access restored, kill-switch

- **Flyer** (merged from the flyer branch): one-page Letter landscape 3D trail map (PDF, 300 dpi PNG, WebP) and its generator in `tools/flyer-map/`. New in-app page `halloween/trail-map/` (zoomable image, Download PDF, Print, "Print latest map") linked from the Halloween map section, menu, mobile Print sheet and the homepage. The preview is precached; the PDF is cached on first download. A hint appears when the live list has houses the flyer lacks (`data/flyer-houses.json`).
- **Coordinates**: all 46 pins now come from `tools/flyer-map/houses.json` (OSM building centroids; #03 and #25 owner GPS, verified). Production D1 synced to snapshot v4.
- **Icons**: processed transparent icon set from the flyer generator is the marker source (no boxed backgrounds); test asserts real alpha at all four corners of every icon.
- **Admin auth**: Cloudflare Access (one-time PIN) restored with both owner addresses; password path removed; Worker tests (28) on Access JWT fixtures.
- **Kill-switch** `service-worker.js` for returning visitors of the retired Christmas site, proven with a Playwright swap test (old cache-first worker -> kill-switch -> new site).
- Review fixes carried over (SW routing, optimistic-lock guard, restore realigns numbers).
