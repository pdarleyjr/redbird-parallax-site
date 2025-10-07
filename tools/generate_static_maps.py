#!/usr/bin/env python3
"""
MapLibre GL + Puppeteer static map generator for Red Bird Trail
Generates themed static map JPEGs at multiple resolutions
"""

import asyncio
import json
import time
from pathlib import Path
import pandas as pd
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from playwright.async_api import async_playwright

# Configuration
CSV_FILE = Path("../data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv")
OUTPUT_DIR = Path("../assets/maps")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Miami Red Bird neighborhood bounds
MIAMI_BOUNDS = {
    "center": [-80.2974, 25.7398],
    "zoom": 15,
    "viewbox": "25.7200,25.7600,-80.3200,-80.2700"
}

async def geocode_addresses():
    """Geocode addresses from CSV with Miami bias"""
    print("Starting geocoding...")
    
    # Initialize geocoder with rate limiting
    geolocator = Nominatim(user_agent="redbird-trail-oct2025")
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.2)
    
    # Read CSV
    if not CSV_FILE.exists():
        print(f"Warning: CSV file not found at {CSV_FILE}")
        # Use sample data for testing
        pins = [
            {"address": "3821 SW 60th Ave, Miami, FL 33155", "label": "🎃 Pumpkin House", "lat": 25.7398, "lon": -80.2974},
            {"address": "6001 SW 38th St, Miami, FL 33155", "label": "👻 Ghost Manor", "lat": 25.7385, "lon": -80.2960},
            {"address": "5900 SW 39th St, Miami, FL 33155", "label": "🧙 Witch's Cottage", "lat": 25.7375, "lon": -80.2945},
        ]
    else:
        df = pd.read_csv(CSV_FILE)
        
        # Find relevant columns
        addr_col = next((c for c in df.columns if 'address' in c.lower()), None)
        name_col = next((c for c in df.columns if 'fun' in c.lower() or 'name' in c.lower()), None)
        
        pins = []
        for _, row in df.iterrows():
            if addr_col and pd.notna(row[addr_col]):
                address = str(row[addr_col]).strip()
                label = str(row[name_col]).strip() if name_col and pd.notna(row[name_col]) else "House"
                
                # Add Miami context to address
                if "Miami" not in address:
                    address += ", Miami, FL 33155"
                
                # Geocode with viewbox bias
                location = geocode(
                    address,
                    viewbox=((25.7200, -80.3200), (25.7600, -80.2700)),
                    bounded=False
                )
                
                if location:
                    # Determine icon based on label
                    icon = "🎃"
                    if "ghost" in label.lower():
                        icon = "👻"
                    elif "witch" in label.lower():
                        icon = "🧙"
                    elif "spider" in label.lower():
                        icon = "🕷️"
                    elif "bat" in label.lower():
                        icon = "🦇"
                    
                    pins.append({
                        "address": address,
                        "label": f"{icon} {label}",
                        "lat": location.latitude,
                        "lon": location.longitude
                    })
                    print(f"Geocoded: {label} at {location.latitude}, {location.longitude}")
                else:
                    print(f"Failed to geocode: {address}")
                
                time.sleep(1.2)  # Rate limiting
    
    # Save pins to JSON
    pins_file = OUTPUT_DIR / "pins.json"
    with open(pins_file, "w", encoding="utf-8") as f:
        json.dump(pins, f, ensure_ascii=False, indent=2)
    
    print(f"Saved {len(pins)} pins to {pins_file}")
    return pins

async def create_maplibre_html(pins):
    """Create MapLibre GL map HTML"""
    
    html_template = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Red Bird Trail Map</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://unpkg.com/maplibre-gl@3.5.2/dist/maplibre-gl.js"></script>
    <link href="https://unpkg.com/maplibre-gl@3.5.2/dist/maplibre-gl.css" rel="stylesheet">
    <style>
        body {{ margin: 0; padding: 0; }}
        #map {{ position: absolute; top: 0; bottom: 0; width: 100%; }}
        .marker {{
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            font-size: 24px;
            cursor: pointer;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }}
        .marker:hover {{
            transform: scale(1.1);
        }}
        .maplibregl-popup {{
            font-family: system-ui, sans-serif;
        }}
        .maplibregl-popup-content {{
            background: #1c2036;
            color: white;
            padding: 10px 15px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }}
        .maplibregl-popup-close-button {{
            color: white;
        }}
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        const pins = {json.dumps(pins)};
        
        // Initialize map with CARTO Dark Matter style
        const map = new maplibregl.Map({{
            container: 'map',
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: {json.dumps(MIAMI_BOUNDS["center"])},
            zoom: {MIAMI_BOUNDS["zoom"]}
        }});
        
        map.on('load', () => {{
            // Add markers for each pin
            pins.forEach((pin, index) => {{
                if (pin.lat && pin.lon) {{
                    // Create marker element
                    const el = document.createElement('div');
                    el.className = 'marker';
                    el.innerHTML = pin.label.split(' ')[0]; // Just the emoji
                    
                    // Add marker to map
                    new maplibregl.Marker({{element: el}})
                        .setLngLat([pin.lon, pin.lat])
                        .setPopup(
                            new maplibregl.Popup({{ offset: 25 }})
                                .setHTML(`<h3>${{pin.label}}</h3><p>${{pin.address}}</p>`)
                        )
                        .addTo(map);
                }}
            }});
            
            // Create trail path connecting all points
            const coordinates = pins
                .filter(p => p.lat && p.lon)
                .map(p => [p.lon, p.lat]);
            
            if (coordinates.length > 1) {{
                map.addSource('trail', {{
                    type: 'geojson',
                    data: {{
                        type: 'Feature',
                        geometry: {{
                            type: 'LineString',
                            coordinates: coordinates
                        }}
                    }}
                }});
                
                map.addLayer({{
                    id: 'trail-line',
                    type: 'line',
                    source: 'trail',
                    layout: {{
                        'line-join': 'round',
                        'line-cap': 'round'
                    }},
                    paint: {{
                        'line-color': '#ff6a00',
                        'line-width': 3,
                        'line-opacity': 0.8,
                        'line-dasharray': [2, 2]
                    }}
                }});
            }}
            
            // Fit map to show all markers
            if (coordinates.length > 0) {{
                const bounds = coordinates.reduce((bounds, coord) => {{
                    return bounds.extend(coord);
                }}, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
                
                map.fitBounds(bounds, {{ padding: 50 }});
            }}
        }});
    </script>
</body>
</html>'''
    
    # Save HTML file
    html_file = OUTPUT_DIR / "map_interactive.html"
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_template)
    
    print(f"Created interactive map: {html_file}")
    return html_file

async def capture_map_screenshots(html_file):
    """Capture map screenshots at different resolutions using Playwright"""
    
    resolutions = [
        {"name": "mobile", "width": 390, "height": 600},
        {"name": "desktop", "width": 1200, "height": 800}
    ]
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        
        for res in resolutions:
            print(f"Capturing {res['name']} screenshot ({res['width']}x{res['height']})...")
            
            # Create context with viewport
            context = await browser.new_context(
                viewport={"width": res["width"], "height": res["height"]},
                device_scale_factor=2  # Higher quality
            )
            
            page = await context.new_page()
            
            # Navigate to HTML file
            file_url = f"file:///{html_file.absolute().as_posix()}"
            await page.goto(file_url)
            
            # Wait for map to load
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)  # Extra time for map tiles
            
            # Take screenshot
            screenshot_path = OUTPUT_DIR / f"trail_map_{res['name']}.jpg"
            await page.screenshot(
                path=str(screenshot_path),
                full_page=False,
                quality=90,
                type="jpeg"
            )
            
            print(f"Saved: {screenshot_path}")
            
            await context.close()
        
        await browser.close()

async def main():
    """Main execution"""
    print("=" * 50)
    print("Red Bird Trail Map Generator")
    print("=" * 50)
    
    # Step 1: Geocode addresses
    pins = await geocode_addresses()
    
    # Step 2: Create MapLibre HTML
    html_file = await create_maplibre_html(pins)
    
    # Step 3: Capture screenshots
    try:
        await capture_map_screenshots(html_file)
        print("\n✅ Map generation complete!")
    except Exception as e:
        print(f"\n⚠️ Screenshot capture failed: {e}")
        print("You may need to install Playwright browsers:")
        print("  python -m playwright install chromium")

if __name__ == "__main__":
    asyncio.run(main())