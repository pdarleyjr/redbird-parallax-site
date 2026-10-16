# Putting the site on a GoDaddy subdomain of iplcmiami.com

The owner will make the DNS change themselves in GoDaddy. Cloudflare is **not** the DNS host for iplcmiami.com, and nothing below needs it to be.

## What you need to create in GoDaddy (public website)
Pick a subdomain name, for example `trails.iplcmiami.com` (not `redbird`, which still serves the 2025 Christmas site).

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name / Host | `trails` (or your chosen name, without `.iplcmiami.com`) |
| Value / Points to | `pdarleyjr.github.io` |
| TTL | 1 hour (default) |

GoDaddy path: My Products → iplcmiami.com → DNS → Add New Record. Do not add A records, and do not point the name anywhere else.

## What the project does afterwards (tell the implementer the name)
1. Adds a `CNAME` file containing the full name to the repository root and sets it as the GitHub Pages custom domain.
2. Updates `data/site.json` (`origin`) so canonical links and social previews use the new address; rebuilds and verifies the live site.
3. After GitHub finishes issuing the certificate (usually under an hour, up to 24 h), turns on Enforce HTTPS.
4. Keeps the old `pdarleyjr.github.io/redbird-parallax-site/` address working for a redirect-free transition: GitHub redirects it to the custom domain automatically once the custom domain is set.

The site is built with only relative links, so it works on either address. A new domain is a new browser origin: visitors' "visited houses" start fresh once.

## The admin
The admin stays on `https://redbird-admin.pdarleyjr.workers.dev` behind Cloudflare Access (email code login). A custom admin hostname under iplcmiami.com would need that domain's DNS to live on Cloudflare, so it is intentionally not used. The public data feed is `https://redbird-public.pdarleyjr.workers.dev` (read-only); the site falls back to its bundled copy if that is unreachable.

## Not changed
`redbird.iplcmiami.com` keeps serving the old Christmas 2025 site until the owner decides otherwise (gate G4). The old Christmas service worker lives only on that name, so no kill-switch is needed for a new subdomain.
