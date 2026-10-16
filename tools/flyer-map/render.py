"""Render out/flyer.html to a Letter PDF and a 300 dpi PNG."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent / "out"
url = (OUT / "flyer.html").as_uri()
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1056, "height": 816}, device_scale_factor=300 / 96)
    page.goto(url)
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "redbird-trail-map-2026.png"), full_page=False)
    page.emulate_media(media="print")
    page.pdf(path=str(OUT / "redbird-trail-map-2026.pdf"), format="Letter", landscape=True, print_background=True,
             margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}, page_ranges="1")
    pages = page.evaluate("Math.ceil(document.documentElement.scrollHeight / 816)")
    b.close()
for f in OUT.iterdir():
    print(f.name, f.stat().st_size)
print("pages-by-height:", pages)

from PIL import Image
im = Image.open(OUT / "redbird-trail-map-2026.png").convert("RGB")
im.save(OUT / "redbird-trail-map-2026.webp", quality=88, method=6)
im.resize((1600, round(1600 * im.height / im.width)), Image.LANCZOS).save(OUT / "redbird-trail-map-2026-1600.webp", quality=85, method=6)
print("webp written")