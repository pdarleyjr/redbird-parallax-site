# Red Bird 2026 migration

## Source preservation

Remote main still matched d9189bb0f0e91be0ca0720b037065d69ba06f9de. A complete clone was used, with clean branch feature/redbird-halloween-2026 and annotated tag baseline/redbird-before-2026-20261009. No shared history was rewritten.

The Pages API returned build_type: legacy, source.branch: main, source.path: /, status: built, at https://pdarleyjr.github.io/redbird-parallax-site/. No production source, Pages setting, domain or DNS was changed.

## Actual previous execution

index.html had a 2024 title. It loaded css/base.css, style.css and css/featured-houses-unified.css; GSAP, ScrollTrigger, Lenis and PapaParse from CDNs; then js/houses-data.js, js/houses-fixed.js and js/app.js. It displayed the historical Google My Maps iframe and 2025 Jotform.

houses-fixed.js fetched the 2025 CSV, inferred descriptions/icons, interpolated values into innerHTML, and appended a graveyard when absent. Its manual parser appended one unconditionally. The embedded fallback held 27 historical entries. Thus the displayed count depended on the code path. app.js mixed IntersectionObserver, GSAP/ScrollTrigger, Lenis, CSS scroll animations, View Transitions and duplicate anchor handlers, with potentially hidden reveal states.

index_new.html instead referenced houses-final.js/main.js; index-fixed.html referenced houses-fixed.js/app.js/main.js. Other houses variants used old CSVs, inconsistent root/relative paths, HTML interpolation and automatic graveyard entries. CSS variants overlapped cards, visibility, parallax and typography. README/deployment summaries did not reliably match production.

All requested HTML/CSS/JS variants, CSV, scripts, docs, ignore rules, lockfile, media and actual deployment paths were inspected. SOURCE_AUDIT_2026.json records pre-change file hashes and references. No deployment workflows or package manifest existed, although the lockfile declared Puppeteer. There were 4,319 tracked node_modules files; GitHub’s recursive tree also included directory entries. Old Python map scripts used historical CSV/theme inference and Leaflet/cartographic sources.

## Reference and licensing

The reference was inspected at bdf1fdd5630e98ec34a8395d8ff5fe5c4e0e7aeb: HTML, main JS, CSS, SCSS variables/breakpoints, imagery and preview. It used Poppins, Boxicons, Swiper, ScrollReveal, illustrated category cards, store grids, newsletter and footer. Breakpoints included 320, 576, 767, 992 and 1200 px. Issue #9 remained open with a mobile toggle failure report.

The current [Bedimcode repository](https://github.com/bedimcode/responsive-halloween-website) and API still declared no license. Affirmative author permission and third-party asset rights were not established. **No upstream code, bundled library or artwork was imported.** The implementation is original. The retained visual ideas are image-led composition, mobile navigation, illustrated steps, consistent variables and compact footer. Shopping, pricing, newsletters and carousels were omitted.

Poppins Bold is self-hosted as a 7,816-byte Latin WOFF2 from Google Fonts. Its [SIL OFL](https://github.com/google/fonts/blob/main/ofl/poppins/OFL.txt) is retained in assets/fonts/OFL.txt. Existing Red Bird art and supplied map illustrations are used within the organizer’s authorization; no new redistribution license for them is asserted.

## New architecture

data/event-2026.json is the single source for annual facts. A small Node build reads it and scripts/page.html, escapes text and writes committed index.html. Essential dates/hours/navigation/map access work without JS. npm run check detects stale generated HTML. Pages needs no runtime/build service.

The page loads one stylesheet and four small modules. Navigation uses disclosure behavior, Escape/focus handling, close-on-link and a resize reset, without body scroll locking. The map preserves aspect ratio, loads responsive previews, and offers the unchanged full PNG and separate PDF print layout. Pending configuration produces no file actions; failed assets hide affected actions. Direct image access uses native browser zoom, with no modal/custom zoom engine.

data/houses-2026.json contains exactly the 31 supplied directory entries approved by the organizer. Publication requires current year, approved status and valid unique IDs. DOM textContent keeps names/addresses safe. Icons are the exact PDF illustrations explicitly mapped to each stop. Search updates the actual visible count. Missing images retain map numbers; invalid/unapproved/historical data has no fallback.

Old executable HTML entry points, CSS/JS variants, historical CSV, vendor libraries, tracked dependencies, duplicate images/, unrelated parallax art, both videos and stale fix documents were removed from the branch, recoverable from the baseline tag. Canonical original art under assets/img/ was preserved unchanged. Unused historical icons and the zero-byte Maps pin remain documented originals. No registration contact fields were copied.

Pinned development tools: Playwright 1.62.1, axe-core 4.14.0, Lighthouse 13.5.0. Patched transitive overrides pin basic-ftp 6.2.3 and ip-address 10.7.3 after the tooling audit; the final full audit found zero vulnerabilities. Playwright matches the available Chromium/WebKit runtime. The new PR quality workflow checks synchronized HTML, content rules and browser behavior, with no deploy step.

## Design and facts

The hero keeps the full 3:2 Red Bird composition. Phone layouts put title, date/hours and map action before artwork. Event facts use a compact strip; three illustrated steps explain the trail; the map is prominent; compact numbered cards provide the directory. Red Bird Center art supplies community context.

Exact colors/components are in DESIGN_SYSTEM.md. Headings use Poppins Bold, body text uses system UI. Native hover/focus transitions and anchor scrolling respect reduced motion. Nothing requires animation to become visible.

The organizer approved all 31 houses and confirmed 6–9 PM in this conversation. Jotform metadata still names form 252478605926063 “Red Bird Trick-or-Treat Trail: House Sign-Up 2025,” last updated in 2025. It is hidden. No form or submissions were modified.

QA-REPORT-2026.md separates local source/browser/Lighthouse evidence from physical-phone acceptance and deployed/field measurements. No production deployment occurred. An authorized merge will use the existing Pages publishing source and must be followed by production checks.
