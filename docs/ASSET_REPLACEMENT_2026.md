# Artwork replacement register

ASSET_INVENTORY_2026.md and .json record all original dimensions, sizes, signatures, Git/SHA-256 hashes, duplicates, use and inspection limits. Removed originals remain at baseline/redbird-before-2026-20261009.

| Original path | Finding / old usage | 2026 decision | Owner action / recommended output |
|---|---|---|---|
| assets/img/hero_kids_map.jpg | Actual PNG, 1536 × 1024; active hero background; no obsolete date visible | Preserved master, full composition reused via typed derivatives | No replacement needed. Future 3:2 PNG master at 1536 × 1024 or 2304 × 1536, WebP/JPEG derivatives; retain children/cardinal/sign/pumpkins |
| assets/img/redbird-center-night.jpg | Actual PNG, 1536 × 1024; old How It Works background; no stale date visible | Preserved master, optimized community art | No replacement needed. Future 1536 × 1024 PNG/WebP illustration |
| assets/img/halloween-night-map-bg.png | Decorative purple night background behind old map, 1536 × 1024; no year text | Preserved, unused | No required replacement; any future use should suit navy/orange palette |
| images/hero-2025.png, images/hero-night.png, images/hero_kids_map.jpg | Byte-identical hero copies; date-bearing filename did not mean embedded date | Duplicate copies removed; canonical original retained | Use canonical optimized assets |
| images/hero-night_1920.jpg | 1920 × 1280 JPEG hero derivative; no stale date visible | Replaced by derivatives of canonical original | No replacement needed |
| images/about-background.png, images/about-redbird-center.png, images/flyer.png | Identical center art; flyer.png is not the dated registration flyer | Duplicate copies removed; canonical master retained | Use optimized community image |
| images/hero-flyer.png | 1545 × 2000, embedded “Sign up by October 15, 2025” and old QR; inactive in baseline HTML | **Excluded**, recoverable in Git | If desired, recreate at 1545 × 2000 or 2550 × 3300 as PNG/PDF with confirmed 2026 date/hours, approved deadline and verified QR. Never use CSS to correct raster text |
| images/halloween_video.mp4 | 43,154,864 bytes, 1920 × 1080; initial frame has historical flyer-style illustration; inactive baseline | Removed; no autoplay | Optional new approved video only: H.264 1280 × 720, ideally under 3 MB, poster and explicit controls. Full historical text/rights not certified |
| assets/video/section3_720.mp4 | 788,493 bytes; actual 320 × 176; sampled unrelated rabbit animation | Removed | No replacement needed; content/rights review required before reuse |
| assets/img/icons/* | Historical house illustrations; filenames do not establish participation | Preserved originals, not loaded for current houses | New directory uses matching PDF icons. New approved stops need matching transparent 160–240 px WebP/PNG |
| assets/img/google-maps-pin.png | Empty zero-byte file | Preserved unused | Do not use; no replacement needed |
| images/land/*, images/sea/* and duplicate bats/palms/sprites | Unrelated parallax art and duplicates | Removed, preserved in history | No replacement needed |

The supplied 2026 PNG/PDF require no replacement. They are byte-identical to their supplied masters. Responsive WebP previews retain the full image; direct access preserves readable addresses. The PDF’s print layout differs from the illustrated PNG and is intentionally offered separately.
