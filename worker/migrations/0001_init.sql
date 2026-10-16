-- Red Bird Holiday Trails: initial schema (05-TECH-SPEC 5.3). No names, emails or phones of residents are stored.
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('halloween','christmas')),
  year INTEGER NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','updating','published','archived')),
  date TEXT, start_time TEXT, end_time TEXT, time_zone TEXT NOT NULL DEFAULT 'America/New_York',
  details_json TEXT NOT NULL DEFAULT '{}',
  boundary_geojson TEXT, print_extent_json TEXT, trail_geojson TEXT,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL);
CREATE TABLE houses (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  map_number INTEGER NOT NULL CHECK (map_number > 0),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  address_display TEXT NOT NULL, address_key TEXT NOT NULL,
  description TEXT CHECK (description IS NULL OR length(description) <= 280),
  icon TEXT NOT NULL,
  lat REAL, lng REAL,
  location_status TEXT NOT NULL CHECK (location_status IN ('none','suggested','verified')),
  location_source TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','review','published','archived')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL);
CREATE UNIQUE INDEX houses_number ON houses(event_id, map_number);
CREATE UNIQUE INDEX houses_address ON houses(event_id, address_key) WHERE status <> 'archived';
CREATE TABLE house_flags (house_id TEXT NOT NULL REFERENCES houses(id), code TEXT NOT NULL,
  detail TEXT, created_at TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT,
  PRIMARY KEY (house_id, code, created_at));
CREATE TABLE import_batches (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, file_sha256 TEXT NOT NULL,
  row_count INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('previewed','applied','rolled_back')),
  summary_json TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL);
CREATE TABLE import_rows (batch_id TEXT NOT NULL REFERENCES import_batches(id), row_index INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  submitted_on TEXT, address_raw TEXT, house_name_raw TEXT,
  classification TEXT NOT NULL, target_house_id TEXT,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','accepted','rejected','skipped_known')),
  PRIMARY KEY (batch_id, row_index));
CREATE INDEX import_rows_fp ON import_rows(fingerprint);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor TEXT NOT NULL,
  action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, before_json TEXT, after_json TEXT, batch_id TEXT);
CREATE TABLE snapshots (event_id TEXT NOT NULL, version INTEGER NOT NULL, created_at TEXT NOT NULL,
  created_by TEXT NOT NULL, payload_json TEXT NOT NULL, etag TEXT NOT NULL, PRIMARY KEY (event_id, version));
