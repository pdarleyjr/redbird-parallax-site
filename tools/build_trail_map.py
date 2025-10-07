#!/usr/bin/env python3
"""
Build static trail map for Red Bird Trick-or-Treat Trail
Geocodes addresses and creates themed static map images
"""

import json
import time
from pathlib import Path
import pandas as pd
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import staticmap
from PIL import Image, ImageDraw, ImageFont

# Configuration
CSV_PATH = Path('data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv')
OUTPUT_DIR = Path('assets/maps')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Initialize geocoder with rate limiting
geo = Nominatim(user_agent='redbird-trail-map-v2')
geocode = RateLimiter(geo.geocode, min_delay_seconds=1.2, swallow_exceptions=True)

def get_emoji_icon(name, notes=''):
    """Select Halloween emoji based on house name/theme"""
    text = (name + ' ' + notes).lower()
    if 'ghost' in text or 'spooky' in text:
        return '👻'
    elif 'witch' in text or 'magic' in text:
        return '🧙'
    elif 'cat' in text:
        return '🐈‍⬛'
    elif 'bat' in text or 'vampire' in text:
        return '🦇'
    elif 'spider' in text or 'web' in text:
        return '🕷️'
    elif 'zombie' in text or 'dead' in text:
        return '🧟'
    elif 'skeleton' in text or 'bones' in text:
        return '💀'
    elif 'candy' in text or 'treat' in text:
        return '🍬'
    elif 'bird' in text or 'cardinal' in text:
        return '🐦'
    else:
        return '🎃'

def geocode_addresses(csv_path):
    """Read CSV and geocode addresses"""
    print('📍 Reading CSV file...')
    df = pd.read_csv(csv_path)
    
    # Find relevant columns
    addr_col = next((c for c in df.columns if 'address' in c.lower()), None)
    name_col = next((c for c in df.columns if 'fun' in c.lower() or 'name' in c.lower()), None)
    notes_col = next((c for c in df.columns if 'notes' in c.lower()), None)
    
    if not addr_col:
        print('❌ No address column found')
        return []
    
    locations = []
    print(f'🌍 Geocoding {len(df)} addresses...')
    
    for idx, row in df.iterrows():
        address = str(row[addr_col]).strip()
        name = str(row[name_col]).strip() if name_col and pd.notna(row[name_col]) else f'House {idx+1}'
        notes = str(row[notes_col]).strip() if notes_col and pd.notna(row[notes_col]) else ''
        
        # Skip invalid addresses
        if address == 'nan' or not address:
            continue
            
        # Geocode with Miami, FL context
        query = f'{address}, Miami, FL 33155'
        print(f'  Geocoding: {address}...')
        
        location = geocode(query)
        if not location:
            location = geocode(address)
        
        if location:
            locations.append({
                'address': address,
                'name': name,
                'notes': notes,
                'lat': location.latitude,
                'lon': location.longitude,
                'icon': get_emoji_icon(name, notes)
            })
            print(f'    ✅ Found: {location.latitude:.6f}, {location.longitude:.6f}')
        else:
            print(f'    ⚠️ Not found: {address}')
        
        time.sleep(0.3)  # Be nice to the API
    
    # Save geocoded data
    export_dir = Path('export')
    export_dir.mkdir(exist_ok=True)
    
    with open(export_dir / 'geocoded_pins.json', 'w', encoding='utf-8') as f:
        json.dump(locations, f, ensure_ascii=False, indent=2)
    
    print(f'✅ Geocoded {len(locations)} of {len(df)} addresses')
    return locations

def create_static_map(locations, width, height, filename):
    """Create a static map with themed pins"""
    if not locations:
        print('❌ No locations to map')
        return
    
    print(f'🗺️ Creating {width}x{height} map: {filename}')
    
    # Calculate map bounds
    lats = [loc['lat'] for loc in locations]
    lons = [loc['lon'] for loc in locations]
    
    center_lat = sum(lats) / len(lats)
    center_lon = sum(lons) / len(lons)
    
    # Create map with dark theme
    m = staticmap.StaticMap(width, height, url_template='https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png')
    
    # Add trail route (orange dotted line)
    for i in range(len(locations) - 1):
        line = staticmap.Line(
            [(locations[i]['lon'], locations[i]['lat']), 
             (locations[i+1]['lon'], locations[i+1]['lat'])],
            'orange', 3
        )
        m.add_line(line)
    
    # Add location markers
    for loc in locations:
        marker = staticmap.CircleMarker(
            (loc['lon'], loc['lat']), 
            'orange', 
            8
        )
        m.add_marker(marker)
    
    # Render map
    image = m.render(zoom=15)
    
    # Add title overlay
    draw = ImageDraw.Draw(image)
    
    # Title background
    draw.rectangle([(0, 0), (width, 80)], fill=(15, 19, 37, 230))
    
    # Try to use a nice font, fallback to default
    try:
        title_font = ImageFont.truetype('arial.ttf', 36)
        subtitle_font = ImageFont.truetype('arial.ttf', 18)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Draw title
    draw.text((width//2, 25), 'Red Bird Trick-or-Treat Trail', 
              fill='white', font=title_font, anchor='mt')
    draw.text((width//2, 55), 'Halloween Night • October 31st, 2025', 
              fill=(255, 181, 77), font=subtitle_font, anchor='mt')
    
    # Add legend
    legend_y = height - 60
    draw.rectangle([(10, legend_y - 10), (300, height - 10)], 
                   fill=(15, 19, 37, 230))
    draw.text((20, legend_y), '🎃 = Participating Home', 
              fill='white', font=subtitle_font)
    draw.text((20, legend_y + 20), '🟠 = Trail Route', 
              fill=(255, 181, 77), font=subtitle_font)
    
    # Save image
    output_path = OUTPUT_DIR / filename
    image.save(output_path, quality=95)
    print(f'  ✅ Saved: {output_path}')
    
    return output_path

def main():
    """Main execution"""
    print('🎃 Red Bird Trail Map Generator v2')
    print('=' * 50)
    
    # Check if CSV exists
    if not CSV_PATH.exists():
        print(f'❌ CSV not found: {CSV_PATH}')
        print('Please ensure the CSV file is in the data/ directory')
        return
    
    # Geocode addresses
    locations = geocode_addresses(CSV_PATH)
    
    if not locations:
        print('❌ No locations geocoded successfully')
        return
    
    # Create static maps
    print('\n🎨 Generating static maps...')
    
    # Mobile version (9:16 aspect ratio)
    create_static_map(locations, 1080, 1350, 'redbird_trail_1080x1350.jpg')
    
    # Desktop version (16:9 aspect ratio)
    create_static_map(locations, 1920, 1080, 'redbird_trail_1920.jpg')
    
    print('\n✨ Map generation complete!')
    print(f'📁 Maps saved to: {OUTPUT_DIR}')

if __name__ == '__main__':
    main()