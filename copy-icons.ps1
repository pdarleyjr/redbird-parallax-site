# Copy and convert Halloween icons for Red Bird Trick-or-Treat Trail

$downloadsPath = "C:\Users\Peter Darley\Downloads"
$iconsPath = "C:\Users\Peter Darley\Documents\redbird-parallax-site\assets\img\icons"

# Create icons directory if it doesn't exist
if (!(Test-Path $iconsPath)) {
    New-Item -ItemType Directory -Path $iconsPath | Out-Null
}

# Define icon mappings (source file -> target name)
$iconMappings = @{
    "ChatGPT Image Oct 7, 2025, 08_05_42 PM.png" = "pumpkin.png"
    "ChatGPT Image Oct 7, 2025, 08_06_45 PM.png" = "witches-trio.png"
    "ChatGPT Image Oct 7, 2025, 08_07_46 PM.png" = "haunted-house.png"
    "ChatGPT Image Oct 7, 2025, 08_08_36 PM.png" = "haunted-white-house.png"
    "ChatGPT Image Oct 7, 2025, 08_09_24 PM.png" = "ghost-cool.png"
    "ChatGPT Image Oct 7, 2025, 08_10_06 PM.png" = "spiderweb-cottage.png"
    "ChatGPT Image Oct 7, 2025, 08_10_58 PM.png" = "cabin-woods.png"
    "ChatGPT Image Oct 7, 2025, 08_11_50 PM.png" = "candy-critters.png"
    "ChatGPT Image Oct 7, 2025, 08_12_38 PM.png" = "spooky-rizzlers.png"
    "ChatGPT Image Oct 7, 2025, 08_13_29 PM.png" = "sweet-spooky.png"
    "ChatGPT Image Oct 7, 2025, 08_14_21 PM.png" = "monster-house.png"
    "ChatGPT Image Oct 7, 2025, 08_15_10 PM.png" = "sandsnake.png"
    "halloween-tombstone-thumbnail.png" = "tombstone-graveyard.png"
}

# Copy each icon
foreach ($mapping in $iconMappings.GetEnumerator()) {
    $sourcePath = Join-Path $downloadsPath $mapping.Key
    $destPath = Join-Path $iconsPath $mapping.Value
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied: $($mapping.Key) -> $($mapping.Value)"
    } else {
        Write-Host "Warning: Source file not found: $sourcePath" -ForegroundColor Yellow
    }
}

Write-Host "`nAll icons copied successfully!" -ForegroundColor Green
Write-Host "Next step: Convert PNG files to WebP format for better performance" -ForegroundColor Cyan