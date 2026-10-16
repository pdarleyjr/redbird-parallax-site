"""Generate the one-page (Letter landscape) Red Bird Trick-or-Treat Trail flyer map.

Geometry: OpenStreetMap (osm.json, Overpass extract) in local metres (equirectangular,
<0.1% error over 1.5 km), shown on a tilted 3D slab with true perspective.
House anchors: houses.json (OSM addressed building centroids + owner GPS pins).
Output: out/flyer.html (rendered to PDF/PNG by render.py).
"""
import base64, html, json, math, random
from pathlib import Path

import segno
from PIL import Image

W = Path(__file__).resolve().parent
FLYER = W.parents[1] / "docs" / "holiday-trails" / "brand" / "redbird-flyer-2026.webp"
SITE_URL = "https://pdarleyjr.github.io/redbird-parallax-site/"

SKY, SKY_DEEP, PANEL, LINE = "#022255", "#000a20", "#131127", "#2f2c5a"
CARDINAL, NEON_ORANGE = "#e8200c", "#f85818"
CREAM, TEXT, INK, MUTED = "#fdeed3", "#fbf3e3", "#08132b", "#c9cde0"
GOLD, AMBER, CORAL, VIOLET = "#fcd272", "#fa8e29", "#f9a066", "#8858c8"

ICONS = {
    1: "skeleton-dog", 2: "mouse-pumpkin", 3: "bakery", 4: "skull", 5: "candy-pumpkin",
    6: "horror-house", 7: "witch", 8: "witch", 9: "ghost", 10: "fluent-jack-o-lantern",
    11: "dinosaur", 12: "fountain", 13: "ghost", 14: "spider", 15: "villa",
    16: "horror-house", 17: "wicked-house", 18: "jester", 19: "horror-house", 20: "taco",
    21: "bones", 22: "werewolf", 23: "graveyard", 24: "skeleton", 25: "realty",
    26: "door", 27: "witch", 28: "book", 29: "spider", 30: "goalkeeper",
    31: "spider", 32: "fluent-candy", 33: "blues-boooooo-house", 34: "fluent-lollipop",
    35: "fluent-alembic", 36: "sweet-and-spooky-stop", 37: "fluent-bone",
    38: "fluent-black-cat", 39: "fluent-headstone", 40: "fluent-spider-web",
    41: "fluent-bat", 42: "fluent-spider", 43: "fluent-ghost", 44: "fluent-castle",
    45: "fluent-skull", 46: "fluent-derelict-house",
}

# ------------------------------------------------------------------ page (Letter landscape, CSS px @96/in)
PAGE_W, PAGE_H = 1056, 816
MAP_X, MAP_Y, MAP_W, MAP_H = 16, 142, 1024, 466

# ------------------------------------------------------------------ projection
LAT0, LNG0 = 25.7361, -80.2930
MX, MY = math.cos(math.radians(LAT0)) * 111320.0, 110574.0
X0, X1, Y0, Y1 = -650.0, 640.0, -322.0, 302.0          # ground extent (metres)
CX, CY = (X0 + X1) / 2, (Y0 + Y1) / 2
PITCH = math.radians(36)
D = 2600.0
COS_P, SIN_P = math.cos(PITCH), math.sin(PITCH)


def to_m(lat, lng):
    return (lng - LNG0) * MX, (lat - LAT0) * MY


def raw(x, y):
    x, y = x - CX, y - CY
    z = D + y * SIN_P
    return x / z, -(y * COS_P) / z


_c = [raw(x, y) for x in (X0, X1) for y in (Y0, Y1)]
_minx, _maxx = min(p[0] for p in _c), max(p[0] for p in _c)
_miny, _maxy = min(p[1] for p in _c), max(p[1] for p in _c)
PAD_L, PAD_R, PAD_T, PAD_B = 12, 12, 58, 30
FIT = min((MAP_W - PAD_L - PAD_R) / (_maxx - _minx), (MAP_H - PAD_T - PAD_B) / (_maxy - _miny))
OFF_X = PAD_L + ((MAP_W - PAD_L - PAD_R) - (_maxx - _minx) * FIT) / 2 - _minx * FIT
OFF_Y = PAD_T - _miny * FIT


def P(x, y):
    rx, ry = raw(x, y)
    return rx * FIT + OFF_X, ry * FIT + OFF_Y


def scale_at(y):
    return FIT / (D + (y - CY) * SIN_P)


def inside(x, y, m=0.0):
    return X0 - m <= x <= X1 + m and Y0 - m <= y <= Y1 + m


def f(v):
    return f"{v:.1f}"


# ------------------------------------------------------------------ data
osm = json.load(open(W / "osm.json", encoding="utf-8"))["elements"]
houses = json.load(open(W / "houses.json", encoding="utf-8"))
for h in houses:
    h["x"], h["y"] = to_m(h["lat"], h["lng"])
    assert inside(h["x"], h["y"], -20), f"house {h['n']} too close to map edge"


def pip(pt, poly):
    x, y, c = pt[0], pt[1], False
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


buildings = []
for e in osm:
    t = e.get("tags", {})
    if "building" in t and "geometry" in e:
        poly = [to_m(g["lat"], g["lon"]) for g in e["geometry"]]
        if poly[0] == poly[-1]:
            poly = poly[:-1]
        cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
        if inside(cx, cy, -3):
            buildings.append({"poly": poly, "c": (cx, cy), "hot": False})
for h in houses:
    best = next((b for b in buildings if pip((h["x"], h["y"]), b["poly"])), None)
    if best is None:
        cand = min(buildings, key=lambda b: math.dist(b["c"], (h["x"], h["y"])))
        best = cand if math.dist(cand["c"], (h["x"], h["y"])) < 25 else None
    if best and abs(sum(best["poly"][i-1][0]*best["poly"][i][1]-best["poly"][i][0]*best["poly"][i-1][1] for i in range(len(best["poly"]))))/2 < 600:
        best["hot"] = True

ROAD_W = {"primary": 17, "primary_link": 9, "secondary": 13, "secondary_link": 8, "tertiary": 11,
          "residential": 8, "unclassified": 8, "service": 3.8}
roads, canals, parks = [], [], []
for e in osm:
    t = e.get("tags", {})
    if "geometry" not in e:
        continue
    pts = [to_m(g["lat"], g["lon"]) for g in e["geometry"]]
    if t.get("highway") in ROAD_W:
        roads.append({"pts": pts, "w": ROAD_W[t["highway"]], "cls": t["highway"], "name": t.get("name")})
    elif t.get("waterway") == "canal":
        canals.append({"pts": pts, "name": t.get("name")})
    elif t.get("leisure") == "park" or t.get("landuse") == "grass":
        parks.append(pts)


def abbreviate(name):
    for a, b in [("Southwest", "SW"), ("North ", "N "), ("South ", "S "), ("Street", "St"), ("Avenue", "Ave"),
                 ("Court", "Ct"), ("Place", "Pl"), ("Terrace", "Ter"), ("Drive", "Dr")]:
        name = name.replace(a, b)
    return name


def seg_stroke(pts, width_m, color, opacity=1.0, cap="round"):
    out = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        if not (inside(x1, y1, 80) or inside(x2, y2, 80)):
            continue
        a, b = P(x1, y1), P(x2, y2)
        w = width_m * scale_at((y1 + y2) / 2)
        out.append(f'<line x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}" stroke="{color}" '
                   f'stroke-width="{w:.2f}" stroke-linecap="{cap}" opacity="{opacity}"/>')
    return out


def poly_pts(poly, dy=0.0):
    return " ".join(f"{f(P(x, y)[0])},{f(P(x, y)[1] - dy)}" for x, y in poly)


_uri_cache = {}


def data_uri(path):
    if path not in _uri_cache:
        mime = {".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg"}[path.suffix]
        _uri_cache[path] = f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()
    return _uri_cache[path]


def ttf_uri(name):
    return "data:font/ttf;base64," + base64.b64encode((W / "fonts" / name).read_bytes()).decode()


# icons are referenced once via <symbol>, so each image is embedded a single time
icon_keys = sorted(set(ICONS.values()))
small = W / "icons128"; small.mkdir(exist_ok=True)
for k in icon_keys:
    im = Image.open(W / "icons" / f"{k}.png").convert("RGBA").resize((160, 160), Image.LANCZOS)
    im.save(small / f"{k}.png", optimize=True)

# sign crop from the owner's flyer (cardinal + RED BIRD TRICK-OR-TREAT TRAIL sign)
sign_png = W / "sign.png"
Image.open(FLYER).convert("RGB").crop((108, 30, 1000, 690)).save(sign_png, optimize=True)

# ------------------------------------------------------------------ map svg
slab = [(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)]
near_l, near_r, far_l, far_r = P(X0, Y0), P(X1, Y0), P(X0, Y1), P(X1, Y1)
THICK = 12
svg = [f'''<defs>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1b48"/><stop offset="1" stop-color="#14306a"/></linearGradient>
<linearGradient id="side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081538"/><stop offset="1" stop-color="#02071a"/></linearGradient>
<radialGradient id="pinhead" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#34336b"/><stop offset=".62" stop-color="{PANEL}"/><stop offset="1" stop-color="#05040f"/></radialGradient>
<radialGradient id="spec" cx="32%" cy="22%" r="48%"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-20%" y="-30%" width="140%" height="170%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="roofglow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="pinshadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="1.4" dy="2.6" stdDeviation="1.8" flood-color="#000" flood-opacity=".65"/></filter>
<clipPath id="slabclip"><polygon points="{poly_pts(slab)}"/></clipPath>
<clipPath id="disc"><circle r="1"/></clipPath>''']
for k in icon_keys:
    svg.append(f'<symbol id="i-{k}" viewBox="0 0 160 160"><image href="{data_uri(small / f"{k}.png")}" width="160" height="160"/></symbol>')
svg.append("</defs>")

random.seed(7)
svg.append(f'<rect width="{MAP_W}" height="{MAP_H}" rx="18" fill="{SKY_DEEP}"/>')
for _ in range(80):
    sx, sy = random.uniform(10, MAP_W - 10), random.uniform(8, max(far_l[1], far_r[1]) + 4)
    svg.append(f'<circle cx="{f(sx)}" cy="{f(sy)}" r="{random.uniform(.3, .9):.2f}" fill="{CREAM}" opacity="{random.uniform(.2, .65):.2f}"/>')
for sx, sy, s in ((60, 26, 5), (300, 18, 3.5), (720, 30, 4), (980, 50, 3)):
    svg.append(f'<path transform="translate({sx},{sy}) scale({s/10})" d="M0,-10 C1,-2 2,-1 10,0 C2,1 1,2 0,10 C-1,2 -2,1 -10,0 C-2,-1 -1,-2 0,-10Z" fill="{GOLD}" opacity=".85"/>')

svg.append(f'<polygon points="{f(near_l[0]+10)},{f(near_l[1]+THICK+8)} {f(near_r[0]-10)},{f(near_r[1]+THICK+8)} '
           f'{f(far_r[0])},{f(far_r[1]+16)} {f(far_l[0])},{f(far_l[1]+16)}" fill="#000" opacity=".6" filter="url(#soft)"/>')
svg.append(f'<polygon points="{f(near_l[0])},{f(near_l[1])} {f(near_r[0])},{f(near_r[1])} {f(near_r[0])},{f(near_r[1]+THICK)} '
           f'{f(near_l[0])},{f(near_l[1]+THICK)}" fill="url(#side)"/>')
svg.append(f'<polygon points="{poly_pts(slab)}" fill="url(#ground)"/>')
svg.append(f'<line x1="{f(near_l[0])}" y1="{f(near_l[1])}" x2="{f(near_r[0])}" y2="{f(near_r[1])}" stroke="{CARDINAL}" stroke-width="1.4" filter="url(#glow)" opacity=".9"/>')

g = ['<g clip-path="url(#slabclip)">']
for pts in parks:
    g.append(f'<polygon points="{poly_pts(pts)}" fill="#14424f" opacity=".8"/>')
for c in canals:
    g += seg_stroke(c["pts"], 34, "#3f7be0", .35)
    g += seg_stroke(c["pts"], 26, "#0d3a86")
    g += seg_stroke(c["pts"], 9, "#4f8ff0", .45)
order = sorted(roads, key=lambda r: r["w"])
for r in order:
    g += seg_stroke(r["pts"], r["w"] + 3.5, "#060d2a", .95)
for r in order:
    g += seg_stroke(r["pts"], r["w"], "#4e5396" if r["cls"] in ("residential", "unclassified", "service") else "#6d5ea8", .95)
for r in order:
    if r["cls"].startswith("primary"):
        g += seg_stroke(r["pts"], 1.8, NEON_ORANGE, .6, "butt")
g.append("</g>")
svg += g

bpoly = [to_m(25.7330, -80.3000), to_m(25.7330, -80.2860), to_m(25.7392, -80.2860), to_m(25.7392, -80.3000)]
svg.append(f'<polygon points="{poly_pts(bpoly)}" fill="none" stroke="{NEON_ORANGE}" stroke-width="1.3" stroke-dasharray="6 4" opacity=".8" clip-path="url(#slabclip)"/>')

bl = ['<g clip-path="url(#slabclip)">']
for b in sorted(buildings, key=lambda b: -b["c"][1]):
    hpx = 4.2 * scale_at(b["c"][1]) * (1.7 if b["hot"] else 1.0)
    base = [P(x, y) for x, y in b["poly"]]
    walls = "".join(f'<polygon points="{f(base[i-1][0])},{f(base[i-1][1])} {f(base[i][0])},{f(base[i][1])} '
                    f'{f(base[i][0])},{f(base[i][1]-hpx)} {f(base[i-1][0])},{f(base[i-1][1]-hpx)}"/>' for i in range(len(base)))
    bl.append(f'<g fill="{"#8a3412" if b["hot"] else "#0a1235"}">{walls}</g>')
    if b["hot"]:
        bl.append(f'<polygon points="{poly_pts(b["poly"], hpx)}" fill="{AMBER}" stroke="{GOLD}" stroke-width=".6" filter="url(#roofglow)"/>')
    else:
        bl.append(f'<polygon points="{poly_pts(b["poly"], hpx)}" fill="#232a62" stroke="#353c80" stroke-width=".35"/>')
bl.append("</g>")
svg += bl

# ------------------------------------------------------------------ pins: relaxed so heads never overlap
R, H = 14.0, 36.0
for h in houses:
    h["ax"], h["ay"] = P(h["x"], h["y"])
    h["hx"], h["hy"] = h["ax"], h["ay"] - H
for it in range(1400):
    k = .03 if it < 1000 else .01
    for h in houses:
        h["hx"] += (h["ax"] - h["hx"]) * k
        h["hy"] += (h["ay"] - H - h["hy"]) * k
    for i, a in enumerate(houses):
        for b in houses[i + 1:]:
            dx, dy = a["hx"] - b["hx"], a["hy"] - b["hy"]
            d = math.hypot(dx, dy) or .01
            need = 2 * R + 4
            if d < need:
                push = (need - d) / 2
                a["hx"] += dx / d * push; a["hy"] += dy / d * push
                b["hx"] -= dx / d * push; b["hy"] -= dy / d * push
    for a in houses:
        for b in houses:
            if a is not b:
                dx, dy = a["hx"] - b["ax"], a["hy"] - b["ay"]
                d = math.hypot(dx, dy) or .01
                if d < R + 6:
                    a["hx"] += dx / d * (R + 6 - d); a["hy"] += dy / d * (R + 6 - d)
    for h in houses:
        h["hy"] = max(min(h["hy"], h["ay"] - 18), h["ay"] - 170, R + 6)
        h["hx"] = max(min(h["hx"], h["ax"] + 120, MAP_W - R - 8), h["ax"] - 120, R + 8)
worst = min(math.dist((a["hx"], a["hy"]), (b["hx"], b["hy"])) for i, a in enumerate(houses) for b in houses[i + 1:])
longest = max(math.dist((h["hx"], h["hy"]), (h["ax"], h["ay"])) for h in houses)
print(f"closest pin heads {worst:.1f}px (2R={2*R:.0f}); longest needle {longest:.0f}px")

# ------------------------------------------------------------------ street labels: best spot away from pins
obstacles = [(h["hx"], h["hy"], R + 3) for h in houses] + [(h["ax"], h["ay"], 5) for h in houses]
needles = [((h["hx"], h["hy"]), (h["ax"], h["ay"])) for h in houses]


def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    t = max(0, min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (((bx - ax) ** 2 + (by - ay) ** 2) or 1)))
    return math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay))


SLAB_SCREEN = [P(*p) for p in [(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)]]


def on_slab(pt, margin=6):
    if not pip(pt, SLAB_SCREEN):
        return False
    return all(seg_dist(pt, SLAB_SCREEN[i - 1], SLAB_SCREEN[i]) > margin for i in range(4))


def clearance(cx, cy, half_w, ang):
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    samples = [(cx + ca * t, cy + sa * t) for t in (-half_w, -half_w / 2, 0, half_w / 2, half_w)]
    if not all(on_slab(s) for s in samples):
        return -1e9
    best = 1e9
    for sx, sy in samples:
        for ox, oy, r in obstacles:
            best = min(best, math.hypot(sx - ox, sy - oy) - r)
        for a, b in needles:
            best = min(best, seg_dist((sx, sy), a, b) - 1)
    return best


MAJOR = {"Southwest 40th Street": "BIRD RD · SW 40TH ST", "Southwest 57th Avenue": "RED RD · SW 57TH AVE"}
by_name = {}
for r in roads:
    if r["name"] and r["cls"] in ("primary", "secondary", "tertiary", "residential", "unclassified"):
        for a, b in zip(r["pts"], r["pts"][1:]):
            L = math.dist(a, b)
            steps = max(1, int(L // 18))
            for s in range(steps):
                t0 = (s + .5) / steps
                m = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0)
                if inside(*m, -18):
                    by_name.setdefault(r["name"], []).append((m, a, b))
labels, placed = [], []
for name, cands in sorted(by_name.items(), key=lambda kv: (kv[0] not in MAJOR, kv[0])):
    text = MAJOR.get(name, abbreviate(name))
    xs = [c[0][0] for c in cands]; ys = [c[0][1] for c in cands]
    span = max(max(xs) - min(xs), max(ys) - min(ys))
    if span < 110:
        continue
    want = 2 if span > 700 else 1
    scored = []
    for (mx, my), a, b in cands:
        pa, pb = P(*a), P(*b)
        ang = math.degrees(math.atan2(pb[1] - pa[1], pb[0] - pa[0]))
        ang = ang - 180 if ang > 90 else ang + 180 if ang < -90 else ang
        fs = (8.6 if name in MAJOR else 7.8) * max(.88, min(1.1, scale_at(my) / scale_at(CY)))
        px, py = P(mx, my)
        hw = len(text) * fs * .3
        clr = clearance(px, py, hw, ang)
        clr_lab = min((math.dist((px, py), (q[0], q[1])) - hw - q[2] for q in placed), default=1e9)
        scored.append((min(clr, clr_lab), px, py, ang, fs, hw, mx, my))
    scored.sort(reverse=True)
    chosen = []
    for sc in scored:
        if sc[0] < 3 or len(chosen) >= want:
            break
        if all(abs(sc[6] - c[6]) + abs(sc[7] - c[7]) > 450 for c in chosen):
            chosen.append(sc)
    for sc in chosen:
        _, px, py, ang, fs, hw, _, _ = sc
        placed.append((px, py, hw))
        labels.append(f'<text x="{f(px)}" y="{f(py)}" transform="rotate({ang:.1f} {f(px)} {f(py)})" font-size="{fs:.2f}" '
                      f'class="street{" major" if name in MAJOR else ""}">{html.escape(text)}</text>')
for c in canals:
    cands = [((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a, b) for a, b in zip(c["pts"], c["pts"][1:]) if inside(*a, -40) and inside(*b, -40)]
    best = None
    for mx, my, a, b in cands:
        pa, pb = P(*a), P(*b)
        ang = math.degrees(math.atan2(pb[1] - pa[1], pb[0] - pa[0]))
        ang = ang - 180 if ang > 90 else ang + 180 if ang < -90 else ang
        px, py = P(mx, my)
        sc = clearance(px, py, 60, ang)
        if best is None or sc > best[0]:
            best = (sc, px, py, ang)
    if best:
        labels.append(f'<text x="{f(best[1])}" y="{f(best[2])}" transform="rotate({best[3]:.1f} {f(best[1])} {f(best[2])})" '
                      f'font-size="7.6" class="street water">CORAL GABLES WATERWAY</text>')
        break
svg += labels

pins = []
for h in sorted(houses, key=lambda h: h["ay"]):
    ax, ay, hx, hy = h["ax"], h["ay"], h["hx"], h["hy"]
    d = math.hypot(ax - hx, ay - hy) or 1
    ex, ey = hx + (ax - hx) / d * (R - 1), hy + (ay - hy) / d * (R - 1)
    pins.append(f'<ellipse cx="{f(ax+2.4)}" cy="{f(ay+1)}" rx="5" ry="1.9" fill="#000" opacity=".6"/>'
                f'<line x1="{f(ex)}" y1="{f(ey)}" x2="{f(ax)}" y2="{f(ay)}" stroke="{CREAM}" stroke-width="1.1" opacity=".85"/>'
                f'<circle cx="{f(ax)}" cy="{f(ay)}" r="2.4" fill="{CARDINAL}" stroke="{CREAM}" stroke-width=".8"/>')
for h in sorted(houses, key=lambda h: h["ay"]):
    hx, hy, n, key = h["hx"], h["hy"], h["n"], ICONS[h["n"]]
    pins.append(f'<g filter="url(#pinshadow)"><circle cx="{f(hx)}" cy="{f(hy)}" r="{R+1.7:.1f}" fill="{CARDINAL}" filter="url(#glow)"/>'
                f'<circle cx="{f(hx)}" cy="{f(hy)}" r="{R}" fill="url(#pinhead)" stroke="{CREAM}" stroke-width="1.4"/></g>'
                f'<use href="#i-{key}" x="{f(hx-R*.88)}" y="{f(hy-R*.92)}" width="{f(R*1.76)}" height="{f(R*1.76)}"/>'
                f'<circle cx="{f(hx)}" cy="{f(hy)}" r="{R}" fill="url(#spec)"/>'
                f'<circle cx="{f(hx+R*.8)}" cy="{f(hy+R*.68)}" r="7" fill="{CREAM}" stroke="{CARDINAL}" stroke-width="1.3"/>'
                f'<text x="{f(hx+R*.8)}" y="{f(hy+R*.68+2.6)}" class="num">{n}</text>')
svg += pins

nx, ny = MAP_W - 30, 28
svg.append(f'<g transform="translate({nx},{ny})"><circle r="15" fill="{PANEL}" stroke="{CREAM}" stroke-width="1"/>'
           f'<path d="M0,-11 L5,4 L0,1 L-5,4 Z" fill="{CARDINAL}" stroke="{CREAM}" stroke-width=".6"/><text y="12.5" class="north">N</text></g>')
px100 = 100 * scale_at(Y0)
sx0, sy0 = near_l[0] + 6, near_l[1] + THICK + 13
svg.append(f'<g class="scale"><rect x="{f(sx0)}" y="{f(sy0)}" width="{f(px100)}" height="3" fill="{CREAM}"/>'
           f'<rect x="{f(sx0+px100/2)}" y="{f(sy0)}" width="{f(px100/2)}" height="3" fill="{CARDINAL}"/>'
           f'<text x="{f(sx0+px100+6)}" y="{f(sy0+3.6)}">100 m ≈ 330 ft (front edge)</text>'
           f'<line x1="{f(sx0+px100+132)}" y1="{f(sy0+1.5)}" x2="{f(sx0+px100+150)}" y2="{f(sy0+1.5)}" stroke="{NEON_ORANGE}" stroke-width="1.3" stroke-dasharray="4 3"/>'
           f'<text x="{f(sx0+px100+155)}" y="{f(sy0+3.6)}">Trail boundary</text></g>')
lx = near_r[0] - 330
svg.append(f'<g class="scale" transform="translate({f(lx)},{f(sy0-1)})">'
           f'<rect x="0" y="-3" width="10" height="7" fill="{AMBER}" filter="url(#roofglow)"/><text x="15" y="4">Glowing roof = participating house</text>'
           f'<circle cx="166" cy="1" r="2.4" fill="{CARDINAL}" stroke="{CREAM}" stroke-width=".8"/><text x="173" y="4">Needle tip = the house’s exact spot</text></g>')

map_svg = f'<svg viewBox="0 0 {MAP_W} {MAP_H}" width="{MAP_W}" height="{MAP_H}" xmlns="http://www.w3.org/2000/svg">{"".join(svg)}</svg>'

# ------------------------------------------------------------------ directory + page
rows = "".join(
    f'<li><span class="dn">{h["n"]}</span><img src="{data_uri(small / (ICONS[h["n"]] + ".png"))}" alt=""/>'
    f'<span class="dt"><b class="{"long" if len(h["name"]) > 27 else ""}">{html.escape(h["name"])}</b><i>{html.escape(abbreviate(h["address"]))}</i></span></li>'
    for h in sorted(houses, key=lambda h: h["n"]))
qr_uri = segno.make(SITE_URL, error="m").svg_data_uri(dark=INK, light=CREAM, border=2, scale=4)

page = f'''<!doctype html><html><head><meta charset="utf-8"><title>Red Bird Trick-or-Treat Trail 2026 — Trail Map</title>
<style>
@font-face{{font-family:Poppins;font-weight:400;src:url({ttf_uri("Poppins-Regular.ttf")})}}
@font-face{{font-family:Poppins;font-weight:500;src:url({ttf_uri("Poppins-Medium.ttf")})}}
@font-face{{font-family:Poppins;font-weight:600;src:url({ttf_uri("Poppins-SemiBold.ttf")})}}
@font-face{{font-family:Poppins;font-weight:700;src:url({ttf_uri("Poppins-Bold.ttf")})}}
@font-face{{font-family:Poppins;font-weight:800;src:url({ttf_uri("Poppins-ExtraBold.ttf")})}}
@font-face{{font-family:Yellowtail;src:url({ttf_uri("Yellowtail-Regular.ttf")})}}
@page{{size:letter landscape;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{PAGE_W}px;height:{PAGE_H}px;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
body{{font-family:Poppins,sans-serif;color:{TEXT};overflow:hidden;position:relative;
  background:linear-gradient(180deg,{SKY} 0%,#01204f 55%,{SKY_DEEP} 84%,#34173c 95%,#a62d2e 100%)}}
.abs{{position:absolute}}
.sign{{left:14px;top:6px;width:182px;height:135px;background:url({data_uri(sign_png)}) center/contain no-repeat;
  -webkit-mask-image:radial-gradient(ellipse 70% 74% at 50% 50%,#000 74%,transparent 100%)}}
.info{{left:206px;top:14px;right:16px;height:124px}}
.eyebrow{{font-weight:700;letter-spacing:.22em;font-size:10px;color:{NEON_ORANGE};text-transform:uppercase}}
.row{{display:flex;align-items:center;gap:18px;margin-top:6px}}
.banner{{position:relative;display:flex;align-items:center;height:44px;padding:0 38px 0 18px;background:{CREAM};color:{INK};
  font-weight:800;font-size:21px;letter-spacing:.06em;clip-path:polygon(0 0,calc(100% - 24px) 0,100% 50%,calc(100% - 24px) 100%,0 100%)}}
.banner:after{{content:"";position:absolute;inset:0;background:{NEON_ORANGE};
  clip-path:polygon(0 0,calc(100% - 24px) 0,100% 50%,calc(100% - 24px) 100%,0 100%,0 0,3px 3px,3px calc(100% - 3px),calc(100% - 25.5px) calc(100% - 3px),calc(100% - 4px) 50%,calc(100% - 25.5px) 3px,3px 3px)}}
.hours{{font-weight:700;font-size:26px;letter-spacing:.03em;color:{TEXT};text-shadow:0 0 9px rgb(232 32 12 / .6);white-space:nowrap}}
.hours span{{font-weight:500;font-size:12px;color:{MUTED};margin-left:6px;text-shadow:none}}
.how{{margin-top:8px;font-size:10px;line-height:1.5;color:{MUTED};max-width:600px}}
.how b{{color:{CREAM};font-weight:600}}
.tag{{left:338px;width:350px;top:{MAP_Y+MAP_H-28}px;text-align:center;font-family:Yellowtail;font-size:19px;color:{CORAL};text-shadow:0 0 8px rgb(248 88 24 / .5);line-height:1}}
.qr{{position:absolute;right:0;top:0;width:118px;text-align:center}}
.qr img{{width:96px;height:96px;border-radius:9px;box-shadow:0 0 0 2px {CARDINAL},0 0 12px 2px rgb(232 32 12 / .55)}}
.qr p{{font-size:7.4px;font-weight:700;letter-spacing:.12em;margin-top:6px;color:{CREAM};text-transform:uppercase;line-height:1.3}}
.map{{left:{MAP_X}px;top:{MAP_Y}px;width:{MAP_W}px;height:{MAP_H}px;border-radius:18px;
  box-shadow:0 0 0 2px {CARDINAL},0 0 14px 3px rgb(232 32 12 / .5),inset 0 0 12px rgb(232 32 12 / .25)}}
.map svg{{display:block;border-radius:18px}}
.street{{font-family:Poppins;font-weight:600;text-anchor:middle;dominant-baseline:middle;letter-spacing:.02em;fill:{TEXT};
  paint-order:stroke;stroke:#050c28;stroke-width:2.6px;stroke-linejoin:round}}
.street.major{{fill:{GOLD};font-weight:700;letter-spacing:.08em}}
.street.water{{fill:#9cc2ff;font-style:italic;letter-spacing:.14em;font-weight:500}}
.num{{font-family:Poppins;font-weight:800;font-size:7.9px;fill:{INK};text-anchor:middle}}
.north{{font-family:Poppins;font-weight:700;font-size:7px;fill:{CREAM};text-anchor:middle}}
.scale text{{font-family:Poppins;font-size:7.6px;fill:{MUTED}}}
.maptitle{{left:{MAP_X+18}px;top:{MAP_Y+12}px;font-weight:700;font-size:13px;letter-spacing:.18em;color:{CREAM};text-transform:uppercase}}
.maptitle small{{display:block;font-weight:500;letter-spacing:.03em;text-transform:none;font-size:8.6px;color:{MUTED};margin-top:2px}}
.dir{{left:16px;top:{MAP_Y+MAP_H+8}px;width:1024px;bottom:10px;border-radius:14px;background:rgb(19 17 39 / .92);border:1px solid {LINE};padding:6px 12px 4px}}
.dir h2{{display:flex;align-items:center;gap:10px;font-size:10px;font-weight:700;letter-spacing:.22em;color:{CREAM};text-transform:uppercase;margin-bottom:3px}}
.dir h2:before,.dir h2:after{{content:"";flex:1;height:5px;border-top:1.5px solid {VIOLET};border-bottom:1.5px solid {VIOLET}}}
.dir ol{{list-style:none;columns:6;column-gap:8px}}
.dir li{{display:flex;align-items:center;gap:3px;height:17.3px;break-inside:avoid}}
.dn{{flex:0 0 14px;height:14px;border-radius:50%;background:{CREAM};color:{INK};font-weight:800;font-size:7.3px;display:grid;place-items:center;box-shadow:0 0 0 1.2px {CARDINAL}}}
.dir img{{flex:0 0 15px;width:15px;height:15px;object-fit:contain}}
.dt{{display:flex;flex-direction:column;line-height:1.06;min-width:0}}
.dt b{{font-weight:600;font-size:7.4px;color:{TEXT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em}}
.dt b.long{{font-size:6.6px;letter-spacing:-.02em}}
.dt i{{font-style:normal;font-size:6.7px;color:{MUTED};white-space:nowrap}}
.credits{{position:absolute;right:12px;bottom:3px;font-size:5.9px;color:{MUTED};opacity:.85}}
</style></head><body>
<div class="abs sign" role="img" aria-label="Red Bird Trick-or-Treat Trail neon sign"></div>
<div class="abs info">
  <div class="eyebrow">Halloween 2026 · Red Bird neighborhood, Miami</div>
  <div class="row"><div class="banner">SATURDAY · OCTOBER 31, 2026</div><div class="hours">6 – 9 PM<span>trick-or-treat hours</span></div></div>
  <p class="how"><b>{len(houses)} haunted stops.</b> Each pin rises from its real house, and participating roofs glow orange.
    Pin numbers match the list below. Look for decorated porches, stay on sidewalks, and cross at corners.</p>
  <div class="qr"><img src="{qr_uri}" alt="QR code to the Red Bird Trails app"/><p>Live map &amp;<br>nearest house</p></div>
</div>
<div class="abs map">{map_svg}</div>
<div class="abs tag">Same Neighborhood. More Halloween Magic.</div>
<div class="abs maptitle">Trail Map<small>SW 35th St to Bird Rd · SW 57th Ave to SW 64th Ave</small></div>
<div class="abs dir"><h2>The {len(houses)} haunted stops</h2><ol>{rows}</ol>
  <div class="credits">Map data © OpenStreetMap contributors (ODbL) · house positions from registered addresses, Oct 16, 2026 · icons: Red Bird originals &amp; Microsoft Fluent Emoji (MIT) · {SITE_URL}</div></div>
</body></html>'''

(W / "out").mkdir(exist_ok=True)
(W / "out" / "flyer.html").write_text(page, encoding="utf-8")
print("wrote flyer.html", len(page) // 1024, "KB;", len(buildings), "buildings;", sum(b["hot"] for b in buildings), "glowing roofs;", len(labels), "labels")
