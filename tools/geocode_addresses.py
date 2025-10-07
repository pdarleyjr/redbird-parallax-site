import csv, json, time, urllib.parse, urllib.request, os, re
from pathlib import Path

DATA = Path("data")
OUT = Path("assets/maps"); OUT.mkdir(parents=True, exist_ok=True)
CSV = DATA/"Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv"
PINS_JSON = OUT/"pins.json"

def get_icon(name: str) -> str:
    t = (name or "").lower()
    return ("👻" if "haunt" in t else
            "🧙" if "witch" in t else
            "🕷️" if "spider" in t else
            "🦇" if "bat" in t else
            "🐈‍⬛" if "cat" in t else
            "🍬" if ("candy" in t or "sweet" in t) else
            "🐦" if ("cardinal" in t or "bird" in t) else
            "🎃")

def nominatim(q:str):
    base = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": f"{q}, Miami, FL 33155",
        "format": "json", "limit": 1, "addressdetails": 1,
        # viewbox bounds Red Bird area approx (lon,lat,lon,lat)
        "viewbox": "-80.3150,25.7500,-80.2900,25.7300", "bounded": 1
    }
    url = f"{base}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent":"redbird-static-map"})
    with urllib.request.urlopen(req) as r:
        j = json.loads(r.read().decode())
        return j[0] if j else None

rows=[]
with open(CSV, newline='', encoding="utf-8-sig") as f:
    rd = csv.DictReader(f)
    for r in rd:
        addr = (r.get("Address ") or "").strip()
        theme = (r.get('Would you like to give your house a fun "Trick-or-Treat Name" for the map?') or "").strip()
        family = (r.get("Household Name") or "").strip()
        if not addr: continue
        time.sleep(1.1) # be nice to Nominatim
        g = nominatim(addr)
        if not g: continue
        lat, lon = float(g["lat"]), float(g["lon"])
        # hard filter: ensure we're still inside the bbox (sanity)
        if not (-80.3155 <= lon <= -80.2895 and 25.7280 <= lat <= 25.7520):
            continue
        rows.append({
            "address": addr,
            "label": theme or family or "House",
            "lat": lat, "lon": lon,
            "icon": get_icon(theme),
        })

with open(PINS_JSON, "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(rows)} pins to {PINS_JSON}")