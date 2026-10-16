"""Download the admin-uploaded house icons so a regenerated flyer matches the live map.

Uploaded icons have keys that start with "up-". For every house in the live public snapshot that uses one, this saves
icons/<key>.png (converted from the 256 px WebP the public API serves) and returns {map number: icon key} so build_flyer.py
can use it in place of its built-in ICONS entry. Built-in icons are untouched.

Run through build_flyer.py:  python -I build_flyer.py --fetch-icons [--api https://...]
"""
import io, json, urllib.request
from pathlib import Path

from PIL import Image

DEFAULT_API = "https://redbird-public.pdarleyjr.workers.dev"
EVENT = "halloween-2026"


def _get(url):
    request = urllib.request.Request(url, headers={"User-Agent": "redbird-flyer/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def fetch_icons(folder, api=DEFAULT_API):
    """Returns {mapNumber: key} for houses that use an uploaded icon; saves each picture as icons/<key>.png."""
    api = api.rstrip("/")
    snapshot = json.loads(_get(f"{api}/v1/events/{EVENT}/public"))
    houses = (snapshot.get("data") or snapshot)["houses"]
    overrides = {}
    for house in houses:
        key = house.get("icon", "")
        if not key.startswith("up-"):
            continue
        target = Path(folder) / f"{key}.png"
        if not target.exists():
            image = Image.open(io.BytesIO(_get(f"{api}/v1/icons/{key}.webp"))).convert("RGBA")
            image.save(target, optimize=True)
            print(f"fetched {key}")
        overrides[int(house["mapNumber"])] = key
    return overrides
