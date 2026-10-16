-- House icons: the built-in set plus admin uploads (R2 bucket redbird-icons holds the uploaded pictures).
CREATE TABLE icons (
  key TEXT PRIMARY KEY CHECK (key GLOB '[a-z0-9-]*' AND length(key) BETWEEN 1 AND 60),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 40),
  source TEXT NOT NULL CHECK (source IN ('builtin','upload')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL, created_by TEXT NOT NULL);
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('bakery', 'Bakery', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('blues-boooooo-house', 'Blues boooooo house', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('bones', 'Bones', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('book', 'Book', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('candy-pumpkin', 'Candy pumpkin', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('dinosaur', 'Dinosaur', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('door', 'Door', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-alembic', 'Alembic', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-bat', 'Bat', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-black-cat', 'Black cat', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-bone', 'Bone', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-candy', 'Candy', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-castle', 'Castle', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-derelict-house', 'Derelict house', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-ghost', 'Ghost', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-headstone', 'Headstone', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-jack-o-lantern', 'Jack o lantern', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-lollipop', 'Lollipop', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-skull', 'Skull', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-spider-web', 'Spider web', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fluent-spider', 'Spider', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('fountain', 'Fountain', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('ghost', 'Ghost', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('goalkeeper', 'Goalkeeper', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('graveyard', 'Graveyard', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('horror-house', 'Horror house', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('jester', 'Jester', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('mouse-pumpkin', 'Mouse pumpkin', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('realty', 'Realty', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('skeleton-dog', 'Skeleton dog', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('skeleton', 'Skeleton', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('skull', 'Skull', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('spider', 'Spider', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('sweet-and-spooky-stop', 'Sweet and spooky stop', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('taco', 'Taco', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('villa', 'Villa', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('werewolf', 'Werewolf', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('wicked-house', 'Wicked house', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES ('witch', 'Witch', 'builtin', 'active', '2026-10-16T00:00:00.000Z', 'seed');
