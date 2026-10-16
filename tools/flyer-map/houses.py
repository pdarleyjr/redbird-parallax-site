"""Build the 46-house list and snap each to its OSM-addressed building centroid."""
import json, math, re

W = str(__import__("pathlib").Path(__file__).resolve().parent)

HOUSES = [
    (1, "Skeleton Dog", "3911 SW 60th Court"),
    (2, "Mickey & Minnie’s Halloween Party", "3934 SW 58th Court"),
    (3, "Gilbert’s Bakery", "5777 SW 40th Street"),
    (4, "Skull Cove", "5790 SW 39th Street"),
    (5, "Halloween Stop", "5792 SW 39th Street"),
    (6, "Lima’s Nightmare on 39th Street", "5785 SW 39th Street"),
    (7, "The Coven on 39th ST", "5795 SW 39th Street"),
    (8, "Witches’ Den", "3825 SW 58th Avenue"),
    (9, "Boo Bungalow", "3815 SW 58th Avenue"),
    (10, "Haunted House", "3800 SW 58th Avenue"),
    (11, "Jurassic House", "3830 SW 58th Court"),
    (12, "Phantasmal Phountain", "3624 SW 58th Avenue"),
    (13, "The Friendly Ghost House", "3703 SW 58th Avenue"),
    (14, "Spider Crawl", "3601 SW 58th Avenue"),
    (15, "The Spooky Villa", "5735 SW 35th Street"),
    (16, "House of Horrors", "5825 SW 35th Street"),
    (17, "The Wicked House", "5935 SW 35th Street"),
    (18, "House of Trickery", "3601 SW 60th Avenue"),
    (19, "The Fright House!", "3610 SW 60th Avenue"),
    (20, "Walking Dead Taco Stop", "3700 SW 60th Avenue"),
    (21, "Milos House of Bones", "3736 SW 60th Avenue"),
    (22, "The Werewolf Den", "3700 SW 60th Place"),
    (23, "Ghostly Graveyard", "3720 SW 60th Place"),
    (24, "The Skeleton House", "6078 S Waterway Drive"),
    (25, "Trick or Treat Realty", "6212 S Waterway Drive"),
    (26, "Knock if you dare!", "3810 SW 61st Avenue"),
    (27, "Witch Way to the Candy?", "3825 SW 62nd Avenue"),
    (28, "Haunted Book Nook", "6210 SW 38th Street"),
    (29, "The Spider's Den", "6275 SW 39th Street"),
    (30, "The Goalkeeper’s Graveyard", "3821 SW 60th Avenue"),
    (31, "The Haunted Spider House", "3927 SW 58th Court"),
    (32, "Candy Patch", "3604 SW 60th Avenue"),
    (33, "Blues Boo House", "3611 SW 60th Court"),
    (34, "House of Treats NO TRICKS", "6028 SW 35th Street"),
    (35, "The Motley Brew", "6391 SW 39th Street"),
    (36, "Just stop for juice and water", "3710 SW 59th Avenue"),
    (37, "The Bone Yard", "3910 SW 60th Place"),
    (38, "Purr-anormal Cemetery", "5778 SW 35th Street"),
    (39, "The Tipsy Tomb", "5765 SW 35th Street"),
    (40, "Webby’s", "3615 SW 59th Avenue"),
    (41, "Bats in the Cave", "6258 SW 39th Street"),
    (42, "Beware: kids are gone", "5800 SW 35th Street"),
    (43, "The Boo Crew", "3725 SW 59th Avenue"),
    (44, "Le Spooky Chateau", "3801 SW 60th Place"),
    (45, "Skeleton House", "3930 SW 60th Place"),
    (46, "The Boo-tiful Family Home", "5790 SW 35th Street"),
]
OWNER_PINS = {3: (25.734927, -80.288444), 25: (25.7367261, -80.2955533)}


def key(num, street):
    s = street.lower().replace("southwest", "sw").replace("south ", "s ").replace("north ", "n ")
    s = re.sub(r"\b(street|st)\b", "st", s)
    s = re.sub(r"\b(avenue|ave)\b", "ave", s)
    s = re.sub(r"\b(court|ct)\b", "ct", s)
    s = re.sub(r"\b(place|pl)\b", "pl", s)
    s = re.sub(r"\b(drive|dr)\b", "dr", s)
    return f"{num}|{re.sub(r'[^a-z0-9 ]', '', s).strip()}"


def centroid(geom):
    pts = [(g["lat"], g["lon"]) for g in geom]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


osm = json.load(open(f"{W}\\osm.json", encoding="utf-8"))["elements"]
index = {}
for e in osm:
    t = e.get("tags", {})
    if "addr:housenumber" in t and "addr:street" in t:
        loc = (e["lat"], e["lon"]) if e["type"] == "node" else centroid(e["geometry"]) if "geometry" in e else None
        if loc:
            index.setdefault(key(t["addr:housenumber"], t["addr:street"]), (loc, e["type"], e["id"]))

out, report = [], []
for n, name, addr in HOUSES:
    num, street = addr.split(" ", 1)
    hit = index.get(key(num, street))
    if n in OWNER_PINS:
        lat, lng = OWNER_PINS[n]; src = "owner"
        if hit:
            d = math.dist((hit[0][0] * 111320, hit[0][1] * 100300), (lat * 111320, lng * 100300))
            src += f" (osm {d:.0f} m away)"
    elif hit:
        (lat, lng), _, _ = hit; src = "osm-building"
    else:
        lat = lng = None; src = "MISSING"
    out.append({"n": n, "name": name, "address": addr, "lat": lat, "lng": lng, "source": src})
    report.append(f"{n:2} {src:28} {addr}")

json.dump(out, open(f"{W}\\houses.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n".join(report))
print("missing:", [h["n"] for h in out if h["lat"] is None])
