const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// HTML template for the Leaflet map
const MAP_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Red Bird Trail Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; }
        #map { 
            width: WIDTH_PLACEHOLDERpx; 
            height: HEIGHT_PLACEHOLDERpx; 
            background: #0a0c18;
        }
        .leaflet-popup-content { 
            font-family: system-ui, -apple-system, sans-serif;
            color: #333;
        }
        .custom-marker {
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
        }
        .custom-marker:hover {
            transform: scale(1.2);
            background: #ffb54d;
        }
        .trail-path {
            stroke: #ff6a00;
            stroke-width: 3;
            stroke-dasharray: 10, 5;
            fill: none;
            opacity: 0.7;
        }
        .map-title {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 19, 37, 0.9);
            backdrop-filter: blur(10px);
            padding: 10px 30px;
            border-radius: 30px;
            color: #fff;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 24px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div class="map-title">🎃 Red Bird Trick-or-Treat Trail 🎃</div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Initialize map
        var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        });
        
        // Dark theme tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            opacity: 0.9
        }).addTo(map);
        
        // Pins data
        var pins = PINS_DATA_PLACEHOLDER;
        
        // Create custom icon function
        function createCustomIcon(emoji) {
            return L.divIcon({
                html: '<div class="custom-marker">' + emoji + '</div>',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20],
                className: ''
            });
        }
        
        // Add markers
        var markers = [];
        pins.forEach(function(pin) {
            var marker = L.marker([pin.lat, pin.lon], {
                icon: createCustomIcon(pin.themeIcon)
            });
            
            marker.bindPopup('<b>' + pin.houseName + '</b><br>' + pin.address);
            marker.addTo(map);
            markers.push(marker);
        });
        
        // Create bounds to fit all markers
        if (markers.length > 0) {
            var group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.15));
            
            // Draw a decorative trail path connecting houses
            var latlngs = pins.map(p => [p.lat, p.lon]);
            if (latlngs.length > 1) {
                var polyline = L.polyline(latlngs, {
                    color: '#ff6a00',
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '10, 5',
                    className: 'trail-path'
                }).addTo(map);
            }
        }
        
        // Force tiles to load
        setTimeout(function() {
            map.invalidateSize();
        }, 100);
    </script>
</body>
</html>`;

async function generateMap() {
    // Read pins data
    const pinsData = JSON.parse(fs.readFileSync('export/pins.json', 'utf8'));
    console.log(`Loaded ${pinsData.length} pins`);

    // Create assets/maps directory if it doesn't exist
    const mapsDir = 'assets/maps';
    if (!fs.existsSync(mapsDir)) {
        fs.mkdirSync(mapsDir, { recursive: true });
    }

    // Launch Puppeteer
    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Generate desktop map (1920x1080)
    console.log('\nGenerating desktop map (1920x1080)...');
    const desktopHtml = MAP_HTML_TEMPLATE
        .replace('WIDTH_PLACEHOLDER', '1920')
        .replace('HEIGHT_PLACEHOLDER', '1080')
        .replace('PINS_DATA_PLACEHOLDER', JSON.stringify(pinsData));
    
    const desktopHtmlPath = path.join('scripts', 'map_desktop.html');
    fs.writeFileSync(desktopHtmlPath, desktopHtml);

    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1920, height: 1080 });
    await desktopPage.goto(`file:///${path.resolve(desktopHtmlPath).replace(/\\/g, '/')}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    // Wait for map tiles to load using page.evaluate
    await desktopPage.evaluate(() => {
        return new Promise((resolve) => {
            setTimeout(resolve, 3000);
        });
    }); // Wait for map tiles to load
    await desktopPage.screenshot({
        path: path.join(mapsDir, 'trail_map_desktop.jpg'),
        type: 'jpeg',
        quality: 90
    });
    console.log('✓ Desktop map saved to assets/maps/trail_map_desktop.jpg');

    // Generate mobile map (1080x1920)
    console.log('\nGenerating mobile map (1080x1920)...');
    const mobileHtml = MAP_HTML_TEMPLATE
        .replace('WIDTH_PLACEHOLDER', '1080')
        .replace('HEIGHT_PLACEHOLDER', '1920')
        .replace('PINS_DATA_PLACEHOLDER', JSON.stringify(pinsData));
    
    const mobileHtmlPath = path.join('scripts', 'map_mobile.html');
    fs.writeFileSync(mobileHtmlPath, mobileHtml);

    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 1080, height: 1920 });
    await mobilePage.goto(`file:///${path.resolve(mobileHtmlPath).replace(/\\/g, '/')}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    // Wait for map tiles to load using page.evaluate
    await mobilePage.evaluate(() => {
        return new Promise((resolve) => {
            setTimeout(resolve, 3000);
        });
    }); // Wait for map tiles to load
    await mobilePage.screenshot({
        path: path.join(mapsDir, 'trail_map_mobile.jpg'),
        type: 'jpeg',
        quality: 90
    });
    console.log('✓ Mobile map saved to assets/maps/trail_map_mobile.jpg');

    // Clean up
    await browser.close();
    fs.unlinkSync(desktopHtmlPath);
    fs.unlinkSync(mobileHtmlPath);

    console.log('\n✅ Map generation complete!');
}

// Check if puppeteer is installed
try {
    require.resolve('puppeteer');
    generateMap().catch(console.error);
} catch(e) {
    console.log('Puppeteer not found. Installing...');
    console.log('Please run: npm install puppeteer');
    process.exit(1);
}