-- Teachers ask to be paid their wallet balance; an admin pays them outside the app and marks it paid.
CREATE TABLE IF NOT EXISTS payout_requests (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  method TEXT NOT NULL CHECK (method IN ('ecocash','onemoney','innbucks','bank','other')),
  details TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected','cancelled')),
  admin_note TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  wallet_entry_id TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_payout_requests_teacher ON payout_requests(teacher_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status, created_at);
-- At most one open request per teacher.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_requests_one_pending ON payout_requests(teacher_id) WHERE status = 'pending';
