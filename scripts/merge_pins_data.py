import csv
import json

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
    elif 'blue' in name_lower or 'boo' in name_lower:
        return "💙"
    elif 'white house' in name_lower:
        return "🏛️"
    elif 'rizzler' in name_lower:
        return "✨"
    else:
        return "🎃"

# Load existing geocoded data
with open('assets/maps/pins.json', 'r', encoding='utf-8') as f:
    existing_pins = json.load(f)

# Read CSV to get house names
csv_path = 'data/Red_Bird_Trick-or-Treat_Trail_2025-10-06_19_26_14.csv'
house_names = {}

with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        household = row['Household Name'].strip()
        fun_name = row.get('Would you like to give your house a fun "Trick-or-Treat Name" for the map?', '').strip()
        house_names[household] = fun_name

# Create enhanced pins data
enhanced_pins = []

# Map households from existing data
household_map = {
    "Carter-Goldberg Family": "Carter-Goldberg Family",
    "Grape Family": "Grape Family",
    "The Mena Family": "The haunted White House",
    "Fisher Family": "Haunted House",
    "Cachonegrete": "Sweet & Spooky Stop",
    "Caamano-Gonzalez": "Casa Sandsnake",
    "Permuy Family": "Blues Boooooo House",
    "The Alexander's": "The Not-So-Scary House!",
    "The Wood family": "Cabin in the Woods",
    "The Rojo Villamañan Family": "The monster house",
    "Campoamor Family": "The Spooky-Rizzlers",
    "Illueca": "Spiderweb Cottage",
    "Carballosa Family": "Carballosa Candy Critters"
}

# Process existing pins
for pin in existing_pins:
    label = pin['label']
    # Extract household name from label (remove emoji)
    household = label.replace('🎃 ', '').strip()
    
    # Get the fun name or use household name
    fun_name = household_map.get(household, household)
    
    enhanced_pin = {
        'address': pin['address'],
        'lat': pin['lat'],
        'lon': pin['lon'],
        'household': household,
        'houseName': fun_name if fun_name else household,
        'themeIcon': get_theme_icon(fun_name)
    }
    enhanced_pins.append(enhanced_pin)

# Add any missing houses that weren't in the existing pins
# (These would need manual geocoding or a different approach)
additional_houses = [
    {
        'address': '5935 SW 35 St, Miami, FL 33155',
        'lat': 25.7376,
        'lon': -80.2924,
        'household': 'The Rojo Villamañan Family',
        'houseName': 'The monster house',
        'themeIcon': get_theme_icon('The monster house')
    },
    {
        'address': '3715 sw 58 ct Miami Fl 33155',
        'lat': 25.7366,
        'lon': -80.2895,
        'household': 'Campoamor Family',
        'houseName': 'The Spooky-Rizzlers',
        'themeIcon': get_theme_icon('The Spooky-Rizzlers')
    },
    {
        'address': '3601 SW 58 Ave, Miami, FL 33155',
        'lat': 25.7371,
        'lon': -80.2890,
        'household': 'Illueca',
        'houseName': 'Spiderweb Cottage',
        'themeIcon': get_theme_icon('Spiderweb Cottage')
    },
    {
        'address': '3715 SW 59 Ave, Miami, FL 33155',
        'lat': 25.7365,
        'lon': -80.2902,
        'household': 'Carballosa Family',
        'houseName': 'Carballosa Candy Critters',
        'themeIcon': get_theme_icon('Carballosa Candy Critters')
    }
]

# Add additional houses to the list
enhanced_pins.extend(additional_houses)

# Save enhanced pins
output_path = 'export/pins.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(enhanced_pins, f, indent=2, ensure_ascii=False)

print(f"Merged {len(enhanced_pins)} pins with themed icons!")
print(f"Results saved to {output_path}")

# Display the themed houses
print("\nThemed Houses:")
for pin in enhanced_pins:
    print(f"  {pin['themeIcon']} {pin['houseName']}")