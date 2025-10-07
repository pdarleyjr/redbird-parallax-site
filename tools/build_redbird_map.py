# tools/build_redbird_map.py
from pathlib import Path
import time, json, pandas as pd
CSV = Path("data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv")
OUT = Path(".")
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

geo = Nominatim(user_agent="redbird-trail-map")
geocode = RateLimiter(geo.geocode, min_delay_seconds=1.2, swallow_exceptions=True)
reverse = RateLimiter(geo.reverse, min_delay_seconds=1.2, swallow_exceptions=True)

df = pd.read_csv(CSV)
addr_col = [c for c in df.columns if "address" in c.lower()][0]
name_col = next((c for c in df.columns if "fun" in c.lower() or "name" in c.lower()), None)
notes_col= next((c for c in df.columns if "notes" in c.lower()), None)

rows=[]
for _,r in df.iterrows():
    addr = str(r[addr_col]).strip()
    label = (str(r[name_col]).strip() if name_col and pd.notna(r[name_col]) else "")
    notes = (str(r[notes_col]).strip() if notes_col and pd.notna(r[notes_col]) else "")
    q=f"{addr}, Miami, FL 33155"
    g=geocode(q) or geocode(addr)
    lat=lon=None; revtxt=""
    if g:
        lat,lon=g.latitude,g.longitude
        rv=reverse((lat,lon), exactly_one=True, language="en")
        try:
            a=rv.raw["address"]; revtxt=f"{a.get('house_number','')} {a.get('road','')}, {a.get('city','') or a.get('town','')}"
        except: pass
    rows.append({"address":addr,"label":label,"lat":lat,"lon":lon,"notes":notes,"reverse":revtxt})
    time.sleep(0.3)

Path("export").mkdir(exist_ok=True)
with open("export/pins.json","w",encoding="utf-8") as f: json.dump(rows,f,ensure_ascii=False,indent=2)

def pick_icon(text):
    t=(text or "").lower()
    return "👻" if "ghost" in t else \
           "🧙" if "witch" in t or "hat" in t else \
           "🐈‍⬛" if "cat" in t else \
           "🦇" if "bat" in t else \
           "🐦" if "cardinal" in t or "bird" in t else \
           "🕷️" if "spider" in t else \
           "🍬" if "candy" in t or "treat" in t else "🎃"

pins=[]
for p in rows:
    pins.append({"address":p["address"],"label":p["label"],"lat":p["lat"],"lon":p["lon"],"icon":pick_icon(p["label"]+" "+(p["notes"] or ""))})

html=f"""<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Red Bird Trail Map (Night)</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{{height:100%;margin:0}}.legend{{position:absolute;bottom:16px;left:16px;background:#111a;border-radius:12px;color:#fff;padding:12px 14px;font:14px/1.4 system-ui}}</style>
</head><body>
<div id="map"></div>
<div class="legend"><b>Red Bird Trick-or-Treat Trail</b><div>Night Map · Dotted orange route</div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map=L.map('map',{{zoomControl:true}}).setView([25.7398,-80.2974],15);
L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png',{{maxZoom:19,attribution:'©OpenStreetMap, ©CARTO'}}).addTo(map);
const pins={json.dumps(pins)};
const orange="#FF7A1A";
const icon=(e)=>L.divIcon({{className:'',html:`<div style="font-size:22px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${{e}}</div>`}});
const pts=[]; pins.forEach(p=>{{ if(p.lat&&p.lon){{ pts.push([p.lat,p.lon]); L.marker([p.lat,p.lon],{{icon:icon(p.icon)}}).addTo(map).bindPopup(`<b>${{p.label||'House'}}</b><br/>${{p.address}}`); }} }});
if(pts.length){{ L.polyline(pts,{{color:orange,weight:3,opacity:.9,dashArray:"6 6"}}).addTo(map); map.fitBounds(L.latLngBounds(pts),{{padding:[40,40]}}); }}
</script></body></html>"""
Path("map.html").write_text(html,encoding="utf-8")
print("Wrote: map.html and export/pins.json")