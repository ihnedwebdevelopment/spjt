-- Recenze od zákazníků. Na web se dostanou až po schválení majitelem.
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  place TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',          -- jen pro majitele, na webu se nezobrazuje
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | hidden
  reply TEXT NOT NULL DEFAULT '',          -- veřejná odpověď majitele
  ip_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  approved_at INTEGER
);
CREATE INDEX IF NOT EXISTS reviews_status ON reviews (status, created_at);
CREATE INDEX IF NOT EXISTS reviews_ip ON reviews (ip_hash, created_at);
