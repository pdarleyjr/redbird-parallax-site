# Copy all Halloween icons for Red Bird Trick-or-Treat Trail
$downloadsPath = "C:\Users\Peter Darley\Downloads"
$iconsPath = "C:\Users\Peter Darley\Documents\redbird-parallax-site\assets\img\icons"

# Create icons directory if it doesn't exist
if (!(Test-Path $iconsPath)) {
    New-Item -ItemType Directory -Path $iconsPath | Out-Null
}

# Define icon mappings based on the house names from the screenshot
$iconMappings = @{
    # The icon files with their target names
    "ChatGPT Image Oct 7, 2025, 01_10_53 PM.png" = "three-witch-house.png"
    "halloween-tombstone-thumbnail.png" = "tombstone-graveyard.png"
    "ChatGPT Image Oct 7, 2025, 08_15_03 PM.png" = "sandsnake.png"
    "ChatGPT Image Oct 7, 2025, 08_11_02 PM.png" = "candy-critters.png"
    "ChatGPT Image Oct 7, 2025, 08_08_35 PM.png" = "white-house.png"
    "ChatGPT Image Oct 7, 2025, 08_05_42 PM.png" = "pumpkin.png"
    "ChatGPT Image Oct 7, 2025, 08_02_47 PM.png" = "monster-house.png"
    "ChatGPT Image Oct 7, 2025, 07_59_10 PM.png" = "spooky-rizzlers.png"
    "ChatGPT Image Oct 7, 2025, 07_57_22 PM.png" = "spiderweb-cottage.png"
    "ChatGPT Image Oct 7, 2025, 07_51_10 PM.png" = "haunted-generic.png"
    "ChatGPT Image Oct 7, 2025, 07_47_47 PM.png" = "sweet-spooky.png"
    "ChatGPT Image Oct 7, 2025, 02_08_52 PM.png" = "blues-house.png"
    "ChatGPT Image Oct 7, 2025, 01_57_53 PM.png" = "not-so-scary.png"
    "ChatGPT Image Oct 7, 2025, 01_52_23 PM.png" = "cabin-woods.png"
}

# Copy each icon
$copiedCount = 0
foreach ($mapping in $iconMappings.GetEnumerator()) {
    $sourcePath = Join-Path $downloadsPath $mapping.Key
    $destPath = Join-Path $iconsPath $mapping.Value
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "✓ Copied: $($mapping.Value)" -ForegroundColor Green
        $copiedCount++
    } else {
        Write-Host "✗ Not found: $($mapping.Key)" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Successfully copied $copiedCount icons!" -ForegroundColor Cyan
Write-Host "📍 Location: $iconsPath" -ForegroundColor Cyan