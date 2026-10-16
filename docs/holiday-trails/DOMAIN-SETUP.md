# Domain: https://redbird.iplcmiami.com/ (done 2026-10-16)

The site, the PWA and every future Red Bird event live at **https://redbird.iplcmiami.com/**. GoDaddy DNS needed no change: `redbird` is a CNAME to `pdarleyjr.github.io` (kept). Only the GitHub Pages custom domain moved between repositories.

| Step | Time (UTC, 2026-10-16) |
|---|---|
| Kill-switch `service-worker.js` live on the old address first | before 15:00 |
| Christmas repo `pdarleyjr/red-bird-holiday-trail`: CNAME file deleted and Pages custom domain cleared | 15:29:00–15:29:08 |
| This repo: domain PR merged (CNAME file, canonical origin, flyer QR) | 15:29:19 |
| This repo: Pages custom domain set (HTTPS enforcement already on) | 15:29:22 |
| New site answering on the domain (404 page, kill-switch file served) | by 15:30:05 |
| Canonical URLs show the new domain | 15:30:31 |

`https://pdarleyjr.github.io/redbird-parallax-site/` now answers 301 to the new address. The Christmas 2025 site stays at https://pdarleyjr.github.io/red-bird-holiday-trail/.

## Returning Christmas visitors
Their browsers hold a cache-first worker registered at `/service-worker.js`. The kill-switch is served at that exact URL: it deletes only caches named `red-bird-holiday-trail-*`, unregisters itself and reloads open pages. It is proven by `tests/e2e/killswitch.spec.mjs` (old worker swapped for the kill-switch, then the new site loads). The current app's worker is `/sw.js`. Keep `service-worker.js` until at least 2026-12-31.

## Rollback
Give the domain back: delete the repo-root `CNAME`, clear the Pages custom domain here, then set it again in the Christmas repo (Settings → Pages) and re-add its `CNAME` file. DNS stays as is.

## Only one hostname (added 2026-10-16)

GitHub Pages serves exactly one custom domain per site: `redbird.iplcmiami.com` (the `CNAME` file). Any other hostname that someone points at the Pages host, for example `redbirdtrail.iplcmiami.com`, returns a GitHub 404 page with a certificate that does not match, even though DNS resolves. That is not a site bug. If an extra address is wanted, do not add another CNAME to the Pages host. Make it a **GoDaddy forward** (Domains > the hostname > Forwarding, 301 permanent, "Forward only") to `https://redbird.iplcmiami.com/`.
