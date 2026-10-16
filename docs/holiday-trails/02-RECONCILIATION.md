# Red Bird Holiday Trails — Data Reconciliation

> Note: the 15 registrations not yet approved for publication (stops #32–#46) appear as `[new #N …]` placeholders until gate G2a. The full table is regenerated locally by `scripts/reconcile.mjs` from the private CSV and kept in the owner's local plan copy.

## 2. Data reconciliation (Deliverable 2)

Source: `C:\Users\Peter Darley\Downloads\Red_Bird_Trick-or-Treat_Trail_2026-10-16_05_15_39.csv` (47 rows; header `"Address "` has trailing space; also `Your Name`, `Contact Email`, `Contact Phone Number` — **private, never leave the admin's machine/browser**). Compared with `data/houses-2026.json` @ ea72e49. The export is sorted newest-first.

**Verified totals:** 47 submissions → **46 distinct normalized addresses** = 31 existing (all 31 published houses present; none missing) + **15 new**; 1 duplicate address with conflicting names; 1 blank house name. No published house is absent from the export (so no removal candidates).

### 2.1 Existing houses (31) — classification
| Stop | Address | Published name | CSV result |
|---|---|---|---|
| 01 | 3911 SW 60th Court | Skeleton Dog | unchanged |
| 02 | 3934 SW 58th Court | Mickey & Minnie’s Halloween Party | cosmetic (CSV adds 🎃👻) → keep published |
| 03 | 5777 SW 40th Street | Gilbert’s Bakery | unchanged · **geocode: no match** (SW 40th St = Bird Rd) → manual placement |
| 04 | 5790 SW 39th Street | Skull Cove | unchanged |
| 05 | 5792 SW 39th Street | Halloween Stop | **INCOMPLETE: CSV name blank** → owner decided 2026-10-16: keep "Halloween Stop" (flag `missing_name` resolved; a future named submission shows as `name_changed` for review) |
| 06 | 5785 SW 39th Street | Lima’s Nightmare on 39th Street | unchanged |
| 07 | 5795 SW 39th Street | The Coven on 39th ST | unchanged |
| 08 | 3825 SW 58th Avenue | Witches’ Den | unchanged |
| 09 | 3815 SW 58th Avenue | Boo Bungalow | unchanged |
| 10 | 3800 SW 58th Avenue | Corner House of Horrors → **Haunted House** | **CONFLICT resolved by owner 2026-10-16:** both submissions (Sep 8 "The House of Screams", Oct 4 "Corner House of Horrors") are superseded; publish as **"Haunted House"** with the **pumpkin** icon (`assets/img/icons/pumpkin.png` → marker `pumpkin`; keep that source file when removing the rest of `assets/img/icons/`). Single marker; id `stop-10`/number 10 unchanged; recorded in decisions file + audit |
| 11 | 3830 SW 58th Court | Jurassic House | cosmetic (🦖🦴) |
| 12 | 3624 SW 58th Avenue | Phantasmal Phountain | unchanged |
| 13 | 3703 SW 58th Avenue | The Friendly Ghost House | unchanged |
| 14 | 3601 SW 58th Avenue | Spider Crawl | unchanged |
| 15 | 5735 SW 35th Street | The Spooky Villa | unchanged |
| 16 | 5825 SW 35th Street | House of Horrors | unchanged |
| 17 | 5935 SW 35th Street | The Wicked House | unchanged |
| 18 | 3601 SW 60th Avenue | House of Trickery | unchanged |
| 19 | 3610 SW 60th Avenue | The Fright House! | unchanged |
| 20 | 3700 SW 60th Avenue | Walking Dead Taco Stop | unchanged |
| 21 | 3736 SW 60th Avenue | Milos House of Bones | unchanged |
| 22 | 3700 SW 60th Place | The Werewolf Den | unchanged |
| 23 | 3720 SW 60th Place | Ghostly Graveyard | unchanged |
| 24 | 6078 S Waterway Drive | The Skeleton House | unchanged |
| 25 | 6212 S Waterway Drive | Trick or Treat Realty | unchanged · **geocode returned N Waterway (wrong)** → manual placement |
| 26 | 3810 SW 61st Avenue | Knock if you dare! | unchanged |
| 27 | 3825 SW 62nd Avenue | Witch Way to the Candy? | unchanged |
| 28 | 6210 SW 38th Street | Haunted Book Nook | unchanged |
| 29 | 6275 SW 39th Street | The Spider's Den | unchanged |
| 30 | 3821 SW 60th Avenue | The Goalkeeper’s Graveyard | unchanged |
| 31 | 3927 SW 58th Court | The Haunted Spider House | cosmetic (case only) |

### 2.2 New houses (15) — proposed stable ids/numbers (appended by earliest submission; same-day ties broken by reverse export order)
| Stop | Address (normalized) | Submitted | House name | Flags |
|---|---|---|---|---|
| 32 | [new #32 address] | Oct 9 | [new #32 name] | — |
| 33 | [new #33 address] | Oct 11 | [new #33 name] | icon candidate `blues-boooooo-house` |
| 34 | [new #34 address] | Oct 11 | [new #34 name] | — |
| 35 | [new #35 address] | Oct 13 | [new #35 name] | westernmost point (~200 m W of next) → boundary check |
| 36 | [new #36 address] | Oct 14 | [new #36 name] | `name_review` (reads like a note, not a theme) |
| 37 | [new #37 address] | Oct 14 | [new #37 name] | — |
| 38 | [new #38 address] | Oct 14 | [new #38 name] | `zip_mismatch` (33154 given; geocodes correctly in 33155) |
| 39 | [new #39 address] | Oct 14 | [new #39 name] | — |
| 40 | [new #40 address] | Oct 14 | [new #40 name] | icon candidate `the-webbed-manor` |
| 41 | [new #41 address] | Oct 15 | [new #41 name] | — |
| 42 | [new #42 address] | Oct 15 | [new #42 name] | — |
| 43 | [new #43 address] | Oct 15 | [new #43 name] | — |
| 44 | [new #44 address] | Oct 15 | [new #44 name] | — |
| 45 | [new #45 address] | Oct 15 | [new #45 name] | `similar_name` to #24 "The Skeleton House" |
| 46 | [new #46 address] | Oct 15 | [new #46 name] | note: 5790 SW **39th** St is #04 (different street, not a dup) |

### 2.3 Geography (Census geocoder, interpolated — all status `suggested`, none `verified`)
44/46 matched in Miami FL 33155. Extent of matches: lat 25.7346–25.7381, lng −80.2986 to −80.2876 (≈1.1 km × 0.4 km). Needs manual placement: #03 (no match), #25 (wrong street). Interpolated points can land mid-parcel or on the wrong frontage, so every pin needs admin drag-verification before it is marked `verified`. Preferred geocoder order for the admin tool: Miami-Dade County GIS address points (parcel-accurate; **Sonnet must verify a current public endpoint and its terms** before use) → US Census (no key, no CORS → call from Worker) → Nominatim (≤1 req/s, identifying UA).

**Proposed event boundary (admin must approve):** rectangle SW 35th St (north) – SW 40th St/Bird Rd (south), SW 57th Ave (east) – SW 64th Ave (west): `[[-80.3000,25.7330],[-80.2860,25.7330],[-80.2860,25.7392],[-80.3000,25.7392]]`. Print extent = boundary padded 6%.

### 2.4 Items requiring administrator decision (blocking for publication of those items only)
Resolved by owner on 2026-10-16: **3800 SW 58th Ave → "Haunted House" + pumpkin icon**; **5792 SW 39th St → keep "Halloween Stop"**. Still open (Sonnet asks at G2a, day 1):
3. #36 [new #36 name] — publish as name, or treat as a hydration-stop note.
4. Icon confirmation for #33/#40/#36 candidates (else generic icons).
5. Location verification for all 46 pins (drag in admin); manual placement for #03 and #25.
6. Boundary approval.

---

