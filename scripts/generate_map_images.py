import json
import os
import subprocess
import tempfile
from pathlib import Path

# HTML template for the Leaflet map
MAP_HTML_TEMPLATE = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Red Bird Trail Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body {{ margin: 0; padding: 0; }}
        #map {{ 
            width: {width}px; 
            height: {height}px; 
            background: #0a0c18;
        }}
        .leaflet-popup-content {{ 
            font-family: system-ui, -apple-system, sans-serif;
            color: #333;
        }}
        .custom-marker {{
            background: rgba(255, 106, 0, 0.9);
            border: 3px solid #fff;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            transition: all 0.3s ease;
        }}
        .custom-marker:hover {{
            transform: scale(1.2);
            background: #ffb54d;
        }}
        .trail-path {{
            stroke: #ff6a00;
            stroke-width: 3;
            stroke-dasharray: 10, 5;
            fill: none;
            opacity: 0.7;
        }}
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Initialize map
        var map = L.map('map', {{
            zoomControl: false,
            attributionControl: false
        }});
        
        // Dark theme tiles
        L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
            maxZoom: 19,
            opacity: 0.9
        }}).addTo(map);
        
        // Pins data
        var pins = {pins_json};
        
        // Create custom icon function
        function createCustomIcon(emoji) {{
            return L.divIcon({{
                html: '<div class="custom-marker">' + emoji + '</div>',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20],
                className: ''
            }});
        }}
        
        // Add markers
        var markers = [];
        pins.forEach(function(pin) {{
            var marker = L.marker([pin.lat, pin.lon], {{
                icon: createCustomIcon(pin.themeIcon)
            }});
            
            marker.bindPopup('<b>' + pin.houseName + '</b><br>' + pin.address);
            marker.addTo(map);
            markers.push(marker);
        }});
        
        // Create bounds to fit all markers
        if (markers.length > 0) {{
            var group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
            
            // Draw a decorative trail path connecting houses
            var latlngs = pins.map(p => [p.lat, p.lon]);
            if (latlngs.length > 1) {{
                var polyline = L.polyline(latlngs, {{
                    color: '#ff6a00',
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '10, 5',
                    className: 'trail-path'
                }}).addTo(map);
            }}
        }}
        
        // Force tiles to load
        setTimeout(function() {{
            map.invalidateSize();
        }}, 100);
    </script>
</body>
</html>'''

def create_map_html(pins_data, width, height):
    """Create HTML for the map with given dimensions"""
    return MAP_HTML_TEMPLATE.format(
        width=width,
        height=height,
        pins_json=json.dumps(pins_data)
    )

def take_screenshot_with_node(html_path, output_path, width, height):
    """Use Node.js and Puppeteer to take a screenshot"""
    
    # Node.js script to take screenshot
    node_script = f'''
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {{
    const browser = await puppeteer.launch({{
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }});
    
    const page = await browser.newPage();
    await page.setViewport({{ width: {width}, height: {height} }});
    
    // Load the HTML file
    await page.goto('file:///' + path.resolve('{html_path}').replace(/\\\\/g, '/'), {{
        waitUntil: 'networkidle0',
        timeout: 30000
    }});
    
    // Wait for map tiles to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({{
        path: '{output_path}',
        type: 'jpeg',
        quality: 90,
        fullPage: false
    }});
    
    await browser.close();
    console.log('Screenshot saved to {output_path}');
}})();
'''
    
    # Save the Node script temporarily
    script_path = 'scripts/screenshot.js'
    with open(script_path, 'w') as f:
        f.write(node_script)
    
    # Run the Node script
    try:
        result = subprocess.run(['node', script_path], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            return False
        print(result.stdout)
        return True
    except Exception as e:
        print(f"Error running Puppeteer: {e}")
        return False
    finally:
        # Clean up
        if os.path.exists(script_path):
            os.remove(script_path)

def main():
    # Create directories
    os.makedirs('assets/maps', exist_ok=True)
    os.makedirs('scripts', exist_ok=True)
    
    # Load pins data
    pins_path = 'export/pins.json'
    if not os.path.exists(pins_path):
        print(f"Error: {pins_path} not found. Run geocode_addresses.py first.")
        return
    
    with open(pins_path, 'r', encoding='utf-8') as f:
        pins_data = json.load(f)
    
    print(f"Loaded {len(pins_data)} pins")
    
    # Check if Puppeteer is installed
    try:
        subprocess.run(['npm', 'list', 'puppeteer'], capture_output=True, check=True)
    except:
        print("Installing Puppeteer...")
        subprocess.run(['npm', 'install', 'puppeteer'], check=True)
    
    # Generate desktop map (1920x1080)
    print("\nGenerating desktop map...")
    desktop_html = create_map_html(pins_data, 1920, 1080)
    desktop_html_path = 'scripts/map_desktop.html'
    with open(desktop_html_path, 'w', encoding='utf-8') as f:
        f.write(desktop_html)
    
    desktop_output = 'assets/maps/trail_map_desktop.jpg'
    if take_screenshot_with_node(desktop_html_path, desktop_output, 1920, 1080):
        print(f"✓ Desktop map saved to {desktop_output}")
    
    # Generate mobile map (1080x1920 - portrait)
    print("\nGenerating mobile map...")
    mobile_html = create_map_html(pins_data, 1080, 1920)
    mobile_html_path = 'scripts/map_mobile.html'
    with open(mobile_html_path, 'w', encoding='utf-8') as f:
        f.write(mobile_html)
    
    mobile_output = 'assets/maps/trail_map_mobile.jpg'
    if take_screenshot_with_node(mobile_html_path, mobile_output, 1080, 1920):
        print(f"✓ Mobile map saved to {mobile_output}")
    
    # Clean up HTML files
    for path in [desktop_html_path, mobile_html_path]:
        if os.path.exists(path):
            os.remove(path)
    
    print("\n✅ Map generation complete!")

if __name__ == "__main__":
    main()