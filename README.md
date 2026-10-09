# Red Bird Trick-or-Treat Trail

A community Halloween website for Red Bird in Miami. The organizer confirmed the 2026 event for Saturday, October 31, 6–9 PM, America/New_York, and approved the supplied map’s 31-house directory on October 9, 2026.

## Preview and checks

Install Node.js 22 or newer. From this repository:

```text
npm ci --ignore-scripts
npm run dev
```

Open http://127.0.0.1:4173/redbird-parallax-site/. The same server supports / for checking relative paths. Stop with Ctrl+C. Use an HTTP server instead of double-clicking index.html: browsers restrict JSON loading and modules on file://.

```text
npm run build
npm run check
npm test
npx playwright install chromium webkit
npm run test:browser
```

The website has **zero runtime dependencies**. Node generates the checked-in HTML. npm packages are development tools for browser QA and Lighthouse. Pages needs no build command.

## Files to maintain

| File | Purpose |
|---|---|
| data/event-2026.json | Date, hours, timezone, map paths, registration approval and directory publication |
| data/houses-2026.json | Approved public names, addresses, map numbers and icons |
| scripts/page.html | Page layout; npm run build generates index.html |
| assets/css/styles.css | Single active stylesheet and design variables |
| assets/js/ | Menu, map checks, house rendering and shared publication rules |
| assets/maps/ | Original masters and smaller display previews |
| assets/img/optimized/ | Display derivatives of original Red Bird artwork |
| assets/img/trail/ | Exact Halloween illustrations extracted from the supplied PDF |
| docs/ | Migration, approvals, asset register and actual QA evidence |

## Change event details

1. Edit data/event-2026.json in a text editor.
2. Change only confirmed facts. Hours use 24-hour values, such as 18:00 and 21:00. Set their status to confirmed only when approved; use pending when uncertain.
3. Save, run npm run build, and refresh the preview.
4. Run npm run check and npm test before submitting changes.

For another year, create that year’s event and house files, update the configuration filename read in scripts/build.mjs, and update README/tests. Reset hours, registration, map and houses to pending until the organizer supplies that year’s facts. Do not rename old participant data and assume approval carries forward.

## Replace the map

1. Preserve an archival copy outside the website.
2. Place the high-resolution PNG and optional PDF in assets/maps/.
3. Create smaller WebP previews at the configured widths, preserving the full artwork and aspect ratio.
4. Update map.image, optional map.pdf, preview paths/widths, and master width/height in the event JSON.
5. Set map.status to published, rebuild, and check opening, saving and printing on a phone.

Set map.status to pending and rebuild if no map is ready. The page shows “Trail Map Coming Soon” with no download actions. A published map with a missing master fails the build. Runtime failures hide affected actions. Full-image access uses the original PNG for address readability. The supplied PDF has a separate print layout.

## Add or remove houses

Edit data/houses-2026.json. Each entry requires a unique id, positive mapNumber, public name/address, numeric order, and status: approved. The wrapper’s year/status must agree with the event, whose houses.status must also be approved.

Never include emails, phones, private household names or registration notes. Add an image only when it matches that approved stop; use a relative assets/ path. Missing images leave the map number visible. Duplicate IDs are all withheld; malformed/unapproved entries are skipped. The count comes from displayed records. No historical roster, inferred icon, fictional description, or automatically appended house is used.

Keep the artwork and JSON directory in agreement when participants change. Updating JSON cannot change names embedded in the map image.

## Registration

Registration is hidden. Connected Jotform metadata still identifies the historical form as “House Sign-Up 2025.” When a reviewed 2026 form is supplied, set registration.status to confirmed and registration.url to its HTTPS destination, then rebuild. Review its year, ownership, consent/publication wording and destination; HTTP success is insufficient.

## Artwork

The canonical hero_kids_map.jpg and redbird-center-night.jpg are actually PNG files. Preserve these originals; generate correctly typed derivatives in assets/img/optimized/. Do not correct a raster date with CSS. Consult docs/ASSET_REPLACEMENT_2026.md before restoring old imagery.

## Publishing

Verified October 9, 2026: Pages publishes the **root of main** at https://pdarleyjr.github.io/redbird-parallax-site/ using legacy publishing. Feature pushes and the PR do not deploy. The quality workflow checks PRs and manual dispatch; it has no publishing step.

Review the PR, complete manual device checks, and authorize merging separately. Merging into main causes Pages to publish the checked-in site. No Pages settings, domain or DNS changes are required. After release, check the deployed URL and repeat bounded map/menu acceptance; local Lighthouse is not deployed-site evidence.

The recoverable baseline tag is baseline/redbird-before-2026-20261009 at d9189bb0f0e91be0ca0720b037065d69ba06f9de. Removed legacy files remain in Git history. Prepare a reviewed revert/restoration PR for rollback; do not reset a shared branch.

## Troubleshooting

- Changes absent: run npm run build, refresh, and confirm the checkout served.
- Empty directory: check year, approval statuses, unique IDs and required fields. Read the visible status message.
- Map button missing: check status, existence, spelling and filename case; production is case-sensitive.
- Download opens: use the browser’s Save or Share menu. Mobile browsers may open a PNG/PDF first.
- Test browser unavailable: run npx playwright install chromium webkit. Emulation does not prove real iPhone behavior.
- Production slower: rerun mobile Lighthouse at the deployed URL and review the waterfall. Masters load only on request; display previews are lazy-loaded.

Poppins is self-hosted under assets/fonts/OFL.txt. Bedimcode was a visual reference only; no upstream code or imagery is redistributed.
