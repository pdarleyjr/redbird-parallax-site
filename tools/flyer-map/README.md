# Printable trail map (event flyer)

This builds the one-page, Letter landscape, 3D-style trail map flyer for the 2026 Red Bird Trick-or-Treat Trail. It is a downloadable and printable companion to the app's interactive map, not a replacement for it.

Published outputs, committed under `assets/maps/`:

| File | Use |
|---|---|
| `redbird-trail-map-2026.pdf` | Vector PDF, 11×8.5 in, 1 page |
| `redbird-trail-map-2026.png` | 300 dpi raster (3300×2550) |
| `redbird-trail-map-2026.webp` | Full-size WebP |
| `redbird-trail-map-2026-1600.webp` | In-app preview |

## How it's built

- **Map geometry:**
  - OpenStreetMap streets, buildings, the Coral Gables Waterway and parks, from an Overpass extract in `osm.json` (ODbL; attribution is printed on the page).
  - Drawn on a perspective-tilted slab (pitch 36°) using real metric coordinates.
  - North is up.
- **House positions** (`houses.json`):
  - Each address is matched to its OpenStreetMap addressed building, and the pin goes on the building's centroid. This is the Miami-Dade building and address import.
  - Owner GPS pins override this for #3 (5777 SW 40th St) and #25 (6212 S Waterway Dr).
  - #4 and #5 share one duplex building, so their pins sit about 5 m to either side of its centroid.
  - Participating roofs glow, except on large commercial footprints such as the bakery building at #3.
- **Pins:** each pin head is lifted on a needle whose tip is the house's exact spot. Heads are relaxed so they never overlap (minimum gap is checked at build time). Street labels are placed where they don't collide with pins and stay on the map.
- **Brand:** the palette, fonts and sign art come from `docs/holiday-trails/brand/redbird-flyer-2026.webp`.
- **Icons** (`icons/`, all transparent with no boxed backgrounds):
  - 2026 Red Bird trail art.
  - Three 2024 medallions, cut to clean coins.
  - Microsoft Fluent Emoji 3D (MIT, `icons/FLUENT-LICENSE.txt`).
- **Fonts:** Poppins (OFL) and Yellowtail (Apache-2.0).

## Regenerate after the house list changes

1. Edit `houses.json`: number, name, address, lat/lng, source.
2. If you add a house, give it an entry in `ICONS` in `build_flyer.py`.
3. Run the commands below from this folder. On Windows, use the explicit interpreter; never use bare `python`.

```powershell
$PY = "C:\Users\Peter Darley\AppData\Local\Programs\Python\Python313\python.exe"
& $PY -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m playwright install chromium
.\.venv\Scripts\python.exe -I build_flyer.py
.\.venv\Scripts\python.exe -I render.py
```

Then copy `out/redbird-trail-map-2026.{pdf,png,webp}` and `out/redbird-trail-map-2026-1600.webp` to `assets/maps/`.

`houses.py` re-derives building-snapped coordinates from `osm.json`. To refresh `osm.json`, rerun the Overpass query shown at the top of `houses.py`'s history, with bbox 25.7310,-80.3020,25.7410,-80.2840 (`way[highway]`, `waterway`, `leisure`, `landuse`, `building`, plus `node[addr:housenumber]`).

TODO for the app build: generate `houses.json` from the published snapshot (`data/halloween-2026.public.json`), so the flyer and the interactive map share one source of truth.
