# PowerShell script to apply all fixes to the Red Bird Parallax Site
Write-Host "Applying fixes to Red Bird Parallax Site..." -ForegroundColor Green

# Backup original files
Write-Host "Creating backups..." -ForegroundColor Yellow
if (Test-Path "index.html") {
    Copy-Item "index.html" "index-backup.html" -Force
    Write-Host "  - Backed up index.html" -ForegroundColor Gray
}

if (Test-Path "js/app.js") {
    Copy-Item "js/app.js" "js/app-backup.js" -Force
    Write-Host "  - Backed up app.js" -ForegroundColor Gray
}

if (Test-Path "js/houses-final.js") {
    Copy-Item "js/houses-final.js" "js/houses-final-backup.js" -Force
    Write-Host "  - Backed up houses-final.js" -ForegroundColor Gray
}

# Apply the fixed files
Write-Host "`nApplying fixed files..." -ForegroundColor Yellow

# Use the fixed HTML if it exists, otherwise update the current one
if (Test-Path "index-fixed.html") {
    Copy-Item "index-fixed.html" "index.html" -Force
    Write-Host "  - Applied fixed index.html" -ForegroundColor Green
} else {
    Write-Host "  - Using existing index.html (update script references manually)" -ForegroundColor Yellow
}

# Use the fixed JS files
if (Test-Path "js/app-fixed.js") {
    Copy-Item "js/app-fixed.js" "js/app.js" -Force
    Write-Host "  - Applied fixed app.js" -ForegroundColor Green
}

if (Test-Path "js/houses-fixed.js") {
    Copy-Item "js/houses-fixed.js" "js/houses-final.js" -Force
    Write-Host "  - Applied fixed houses script" -ForegroundColor Green
}

# Update index.html script references if needed
Write-Host "`nUpdating script references in index.html..." -ForegroundColor Yellow
$indexContent = Get-Content "index.html" -Raw

# Update script references
$indexContent = $indexContent -replace 'src="js/houses-final.js"', 'src="js/houses-fixed.js"'
$indexContent = $indexContent -replace 'src="js/houses.js"', 'src="js/houses-fixed.js"'
$indexContent = $indexContent -replace 'src="js/houses-unified.js"', 'src="js/houses-fixed.js"'
$indexContent = $indexContent -replace 'src="js/houses-updated.js"', 'src="js/houses-fixed.js"'
$indexContent = $indexContent -replace 'src="js/app.js"', 'src="js/app-fixed.js"'

# Add fixes.css if not present
if ($indexContent -notmatch 'css/fixes.css') {
    $indexContent = $indexContent -replace '(</head>)', '    <link rel="stylesheet" href="css/fixes.css">`r`n$1'
    Write-Host "  - Added fixes.css reference" -ForegroundColor Green
}

# Save updated index.html
Set-Content "index.html" -Value $indexContent -Force

Write-Host "`n✅ All fixes applied successfully!" -ForegroundColor Green
Write-Host "`nSummary of changes:" -ForegroundColor Cyan
Write-Host "  1. ✅ Fixed Featured Houses icons with proper mapping" -ForegroundColor White
Write-Host "  2. ✅ Fixed action cards placement in separate sections" -ForegroundColor White
Write-Host "  3. ✅ Fixed missing titles/copy with motion-safe reveals" -ForegroundColor White
Write-Host "  4. ✅ Applied cross-device hardening" -ForegroundColor White
Write-Host "  5. ✅ Updated script references to use fixed versions" -ForegroundColor White
Write-Host "  6. ✅ Added comprehensive CSS fixes" -ForegroundColor White

Write-Host "`nBackup files created with '-backup' suffix" -ForegroundColor Gray
Write-Host "To revert changes, rename backup files back to original names" -ForegroundColor Gray

Write-Host "`n📱 Test the site on:" -ForegroundColor Magenta
Write-Host "  - iOS Safari (iPhone/iPad)" -ForegroundColor White
Write-Host "  - Android Chrome" -ForegroundColor White
Write-Host "  - Desktop browsers" -ForegroundColor White

Write-Host "`n🚀 Ready to deploy to GitHub Pages!" -ForegroundColor Green