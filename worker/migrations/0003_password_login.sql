-- Password sign-in: attempt log for rate limiting (no passwords stored), and who/where for audit rows.
CREATE TABLE login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, ip_hash TEXT NOT NULL, ok INTEGER NOT NULL);
CREATE INDEX login_attempts_at ON login_attempts(at);
ALTER TABLE audit_log ADD COLUMN ua TEXT;
ALTER TABLE audit_log ADD COLUMN ip_hash TEXT;
