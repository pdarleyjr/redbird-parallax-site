import csv
import json
import time
import urllib.request
import urllib.parse
import os

def geocode_address(address, viewbox=None):
    """Geocode an address using Nominatim with optional viewbox constraint"""
    base_url = "https://nominatim.openstreetmap.org/search"
    
    # Add Miami, FL to ensure local results
    full_address = f"{address}, Miami, FL 33155"
    
    params = {
        'q': full_address,
        'format': 'json',
        'limit': 1,
        'addressdetails': 1
    }
    
    # Red Bird neighborhood viewbox (SW Miami area)
    if viewbox:
        params['viewbox'] = viewbox
        params['bounded'] = 1
    
    # Add user agent to comply with Nominatim usage policy
    headers = {
        'User-Agent': 'Red Bird Trick-or-Treat Trail Map Generator'
    }
    
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(request) as response:
            data = json.loads(response.read().decode())
            if data:
                return {
                    'lat': float(data[0]['lat']),
                    'lon': float(data[0]['lon']),
                    'display_name': data[0].get('display_name', '')
                }
    except Exception as e:
        print(f"Error geocoding {address}: {e}")
    
    return None

def get_theme_icon(house_name):
    """Assign a theme icon based on the house's fun name"""
    if not house_name:
        return "🎃"
    
    name_lower = house_name.lower()
    
    # Match themes to emojis
    if 'haunted' in name_lower:
        return "👻"
    elif 'monster' in name_lower:
        return "👹"
    elif 'spider' in name_lower:
        return "🕷️"
    elif 'sweet' in name_lower or 'candy' in name_lower:
        return "🍬"
    elif 'spooky' in name_lower:
        return "💀"
    elif 'scary' in name_lower:
        return "😱"
    elif 'cabin' in name_lower or 'woods' in name_lower:
        return "🏚️"
    elif 'snake' in name_lower:
        return "🐍"
    elif 'blue' in name_lower:
        return "💙"
    elif 'white house' in name_lower:
        return "🏛️"
    else:
        return "🎃"

def main():
    # Create directories if they don't exist
    os.makedirs('export', exist_ok=True)
    os.makedirs('scripts', exist_ok=True)
    
    # Red Bird neighborhood approximate viewbox (SW Miami)
    # Longitude first, then latitude for Nominatim
    viewbox = "-80.3125,25.7375,-80.2930,25.7475"
    
    pins = []
    
    # Read CSV file
    csv_path = 'data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv'
    
    with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            address = row['Address '].strip()
            house_name = row.get('Would you like to give your house a fun "Trick-or-Treat Name" for the map?', '').strip()
            household = row['Household Name'].strip()
            
            if address:
                print(f"Geocoding: {address}")
                
                # Geocode with rate limiting to respect Nominatim
                time.sleep(1)  # 1 second delay between requests
                location = geocode_address(address, viewbox)
                
                if location:
                    pin = {
                        'address': address,
                        'lat': location['lat'],
                        'lon': location['lon'],
                        'household': household,
                        'houseName': house_name if house_name else household,
                        'themeIcon': get_theme_icon(house_name)
                    }
                    pins.append(pin)
                    print(f"  [OK] Found: {location['lat']}, {location['lon']}")
                else:
                    print(f"  [X] Could not geocode: {address}")
    
    # Save pins to JSON
    output_path = 'export/pins.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(pins, f, indent=2, ensure_ascii=False)
    
    print(f"\nGeocoded {len(pins)} addresses successfully!")
    print(f"Results saved to {output_path}")

if __name__ == "__main__":
    main()