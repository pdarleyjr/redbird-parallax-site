# Copy all Halloween icons for Red Bird Trick-or-Treat Trail
$downloadsPath = "C:\Users\Peter Darley\Downloads"
$iconsPath = "C:\Users\Peter Darley\Documents\redbird-parallax-site\assets\img\icons"

# Create icons directory if it doesn't exist
if (!(Test-Path $iconsPath)) {
    New-Item -ItemType Directory -Path $iconsPath | Out-Null
}

# Copy each icon individually
$icons = @(
    @{src="ChatGPT Image Oct 7, 2025, 01_10_53 PM.png"; dest="three-witch-house.png"},
    @{src="halloween-tombstone-thumbnail.png"; dest="tombstone-graveyard.png"},
    @{src="ChatGPT Image Oct 7, 2025, 08_15_03 PM.png"; dest="sandsnake.png"},
    @{src="ChatGPT Image Oct 7, 2025, 08_11_02 PM.png"; dest="candy-critters.png"},
    @{src="ChatGPT Image Oct 7, 2025, 08_08_35 PM.png"; dest="white-house.png"},
    @{src="ChatGPT Image Oct 7, 2025, 08_05_42 PM.png"; dest="pumpkin.png"},
    @{src="ChatGPT Image Oct 7, 2025, 08_02_47 PM.png"; dest="monster-house.png"},
    @{src="ChatGPT Image Oct 7, 2025, 07_59_10 PM.png"; dest="spooky-rizzlers.png"},
    @{src="ChatGPT Image Oct 7, 2025, 07_57_22 PM.png"; dest="spiderweb-cottage.png"},
    @{src="ChatGPT Image Oct 7, 2025, 07_51_10 PM.png"; dest="haunted-generic.png"},
    @{src="ChatGPT Image Oct 7, 2025, 07_47_47 PM.png"; dest="sweet-spooky.png"},
    @{src="ChatGPT Image Oct 7, 2025, 02_08_52 PM.png"; dest="blues-house.png"},
    @{src="ChatGPT Image Oct 7, 2025, 01_57_53 PM.png"; dest="not-so-scary.png"},
    @{src="ChatGPT Image Oct 7, 2025, 01_52_23 PM.png"; dest="cabin-woods.png"}
)

$copiedCount = 0
foreach ($icon in $icons) {
    $sourcePath = Join-Path $downloadsPath $icon.src
    $destPath = Join-Path $iconsPath $icon.dest
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied: $($icon.dest)" -ForegroundColor Green
        $copiedCount++
    } else {
        Write-Host "Not found: $($icon.src)" -ForegroundColor Yellow
    }
}

Write-Host "`nSuccessfully copied $copiedCount icons!" -ForegroundColor Cyan
Write-Host "Location: $iconsPath" -ForegroundColor Cyan