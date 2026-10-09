# Red Bird 2026 QA report

Executed October 9, 2026 against the local candidate at `http://127.0.0.1:4173/redbird-parallax-site/`. This is local source/browser evidence. Production was not changed or tested as the new candidate.

## Environment and commands

- Windows host; Node.js 22.22.3.
- Playwright 1.62.1: Chromium 151.0.7922.34 and WebKit 26.5.
- axe-core 4.14.0, WCAG 2 A/AA, 2.1 A/AA and 2.2 A/AA tags.
- Lighthouse 13.5.0, actual host HeadlessChrome 154.0.0.0. Default simulated mobile configuration, then desktop preset. The CLI selected that installed Chrome; the supplied `--chrome-path` argument did not change the reported host version.
- Bundled Python 3.12.14 explicitly invoked by absolute executable path for asset signature/dimension/hash inspection, image optimization, contact sheets, and PDF extraction. No file association or external Python window was used.

Commands actually executed:

```text
npm install --ignore-scripts --no-audit --no-fund
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run check
npm test
npm run test:browser
node --check assets/js/content.js
node --check assets/js/main.js
node --check assets/js/map.js
node --check assets/js/houses.js
git diff --check
npm audit --omit=dev --audit-level=low
npm audit --audit-level=low
node node_modules/lighthouse/cli/index.js http://127.0.0.1:4173/redbird-parallax-site/ --chrome-path="C:\Users\Peter Darley\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe" --chrome-flags="--headless --no-sandbox" --output=json --output=html --output-path=docs/qa/lighthouse-mobile --quiet
node node_modules/lighthouse/cli/index.js http://127.0.0.1:4173/redbird-parallax-site/ --preset=desktop --chrome-path="C:\Users\Peter Darley\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe" --chrome-flags="--headless --no-sandbox" --output=json --output=html --output-path=docs/qa/lighthouse-desktop --quiet
```

The JSON report is authoritative for the browser that ran. The final mobile run was repeated after the development dependency security fixes. The desktop run measured the same unchanged UI before those development-only fixes.

## Results

| Gate | Actual result |
|---|---|
| Generated page synchronization | Pass |
| Node content/publication tests | 16/16 pass |
| Browser checks | 35/35 pass |
| Desktop automated accessibility | Zero violations across selected WCAG tags |
| Mobile menu-open/reduced-motion accessibility | Zero violations across selected WCAG tags |
| JS exceptions / missing resources in normal workflow | None observed |
| Root and repository-prefixed asset references | Both passed |
| Dependency audit, production and development | Zero findings in final lockfile |
| Supplied map preservation | PNG/PDF byte-identical to supplied originals |
| PNG download | Exact original bytes and filename `redbird-trail-2026.png` verified |
| PDF | MIME/signature/original bytes verified; clicking requested the correct PDF |

The full test list and results are in `qa/browser-results.json`; accessibility evidence is in `qa/axe-desktop.json` and `qa/axe-mobile.json`.

### Responsive and visual checks

| Engine | Viewports |
|---|---|
| Chromium | 320×740, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1440×1000, 1920×1080, 844×390 landscape |
| WebKit | 390×844, 844×390 landscape, 1440×1000 |

Screenshots were captured for every matrix entry and visually reviewed in a viewport contact sheet and full desktop/mobile images. Explicit checks verified no horizontal overflow, duplicate IDs, missing decoded images, clipped title widths or undersized primary controls. The map action was visible above the fold at 375, 390 and 430 px. Full-resolution map opening decoded the 6000-pixel master. All approved names/addresses were compared with the source JSON; illustrations were visually matched to the supplied PDF.

### Content and failure cases

Executed: empty roster; one approved house; multiple approved houses; duplicate IDs; unapproved entries; malformed/missing addresses; missing icons; long names/special characters/HTML injection payloads; malformed JSON; historical year rejection; pending map/hours/houses; failed map preview/master; missing PDF; no-JavaScript essential content/navigation; reduced motion; every anchor; search/count/no-match state; menu open/close/Escape/focus/navigation/resize; native map opening; PNG download; PDF link request/delivery. Test fixtures were labeled local test data and never written into production JSON.

### Performance

| Metric | Mobile, final local run | Desktop local run | Target |
|---|---:|---:|---:|
| Lighthouse Performance | 99 | 100 | ≥90 |
| Accessibility | 100 | 100 | ≥95 |
| Best Practices | 100 | 100 | ≥95 |
| SEO | 100 | 100 | ≥95 |
| LCP | 2.028 s | 0.407 s | ≤2.5 s |
| CLS | 0 | 0 | ≤0.1 |
| Total blocking time | 0 ms | 0 ms | Diagnostic, not INP |

No Lighthouse run warnings were reported. HTML reports and JSON evidence are under `qa/lighthouse-*.report.*`. Image requests, font loading and the waterfall were inspected in the reports: smaller hero/cardinal derivatives load first, map previews remain lazy, and PNG/PDF masters are checked by HEAD rather than transferred on page load. No third-party runtime calls or videos occur. Field INP is unavailable and is not claimed from TBT. Production cellular-network performance remains unmeasured.

## Defects found and corrected

- Removed historical data fallback, automatic graveyard insertion and unsafe HTML interpolation.
- Replaced overlapping active CSS/animation systems and root-relative legacy paths.
- Fixed initial mobile navigation layout shift: the first Lighthouse run measured CLS 0.103; the final run measured 0.
- Removed a brand accessible-name override that omitted part of the visible label.
- Added intermediate responsive image widths and smaller icons after Lighthouse delivery feedback.
- Grouped map HEAD requests and hid controls for missing full-map/PDF files.
- Corrected asynchronous resize timing in the test and aligned Playwright with installed browser binaries.
- Headless PDF viewers did not expose a reliable load/navigation event. The final test verifies the clicked request, MIME, signature and exact file bytes; native viewer UI/printing is explicitly left to device acceptance.
- Initial tooling audit flagged eight high dependency findings caused by transitive `basic-ftp` and `ip-address` versions. Development-only overrides pin patched 6.2.3 and 10.7.3; clean install, full audit and the Lighthouse CLI were rerun successfully. No runtime dependencies were introduced.

## Remaining acceptance / limits

1. Actual iPhone Safari: open/close menu, rotate, verify no safe-area obstruction, open full PNG, pinch until addresses are readable, save to Photos/Files, then open/save/print the PDF. Verify saved files remain usable offline.
2. Actual Android Chrome: repeat menu/rotation/map zoom/save/PDF printing.
3. Firefox was not run; available Chromium and WebKit were tested. WebKit on Windows is emulation, not a real iPhone Safari test.
4. After an explicitly authorized release, verify the deployed source, Pages build, title/date/count, asset MIME/hashes and changed workflows, then measure production mobile Lighthouse. Field INP needs real usage evidence.
5. Registration stays hidden until an approved 2026 destination exists.

No reproducible critical/high website defect remained in the executed local suite. Hosted CI is a separate gate, reported with the PR. No production merge or deployment occurred.
