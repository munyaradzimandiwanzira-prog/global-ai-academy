-- Global AI Academy — teaching platform: teacher invites and rosters, commission wallets,
-- notifications, targeted assignments (lessons, Kids Zone levels, code), Zuva reports and
-- lesson plans, admin settings, and privacy-preserving traffic counts.
PRAGMA foreign_keys = ON;

-- ── Teacher ↔ student links ────────────────────────────────────────────────
-- A teacher shares an invite code or link; a student signs up with it (or picks a listed
-- teacher). The link decides who sees the student's progress and who earns commission.
CREATE TABLE teacher_invites (
  id           TEXT PRIMARY KEY,
  teacher_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id TEXT REFERENCES classrooms(id) ON DELETE SET NULL,   -- also join this class
  code         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  label        TEXT NOT NULL DEFAULT '',
  max_uses     INTEGER,                                           -- NULL = unlimited
  used         INTEGER NOT NULL DEFAULT 0,
  expires_at   TEXT,
  revoked_at   TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_teacher_invites_teacher ON teacher_invites(teacher_id, created_at DESC);

CREATE TABLE teacher_students (
  teacher_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source       TEXT NOT NULL DEFAULT 'invite' CHECK (source IN ('invite','chosen','class','admin')),
  invite_id    TEXT REFERENCES teacher_invites(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (teacher_id, student_id)
);
CREATE INDEX idx_teacher_students_student ON teacher_students(student_id);

-- Teachers choose whether students can find them by name at sign-up.
ALTER TABLE users ADD COLUMN teacher_listed INTEGER NOT NULL DEFAULT 1;

-- Existing class members become linked students of the class teacher.
INSERT OR IGNORE INTO teacher_students (teacher_id, student_id, source)
  SELECT c.teacher_id, m.user_id, 'class' FROM classroom_members m JOIN classrooms c ON c.id = m.classroom_id;

-- ── Money ─────────────────────────────────────────────────────────────────
-- Platform settings an admin can change (commission rate, etc.). Values are JSON.
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_by  TEXT REFERENCES users(id),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO settings (key, value) VALUES ('commission_rate_bp', '1000');   -- basis points: 1000 = 10%

-- Commission recorded on each payment (sum of the wallet entries it created).
ALTER TABLE payments ADD COLUMN commission_cents INTEGER NOT NULL DEFAULT 0;

-- Teacher wallet: an append-only ledger. Balance = SUM(amount_cents).
CREATE TABLE wallet_entries (
  id            TEXT PRIMARY KEY,
  teacher_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('commission','reversal','adjustment','payout')),
  amount_cents  INTEGER NOT NULL,
  payment_id    TEXT REFERENCES payments(id) ON DELETE SET NULL,
  student_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  note          TEXT NOT NULL DEFAULT '',
  created_by    TEXT REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_wallet_teacher ON wallet_entries(teacher_id, created_at DESC);
CREATE INDEX idx_wallet_payment ON wallet_entries(payment_id);

-- ── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL DEFAULT '',
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- ── Assignments: what kind of work, and for whom ───────────────────────────
-- kind: code (write and submit code), lesson (complete a course lesson), kids (a Kids Zone
-- level), task (any written task). resource: "track/lesson" or a Kids Zone level key.
ALTER TABLE assignments ADD COLUMN kind TEXT NOT NULL DEFAULT 'code';
ALTER TABLE assignments ADD COLUMN resource TEXT NOT NULL DEFAULT '';

-- No rows = the whole class.
CREATE TABLE assignment_targets (
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, user_id)
);
CREATE INDEX idx_assignment_targets_user ON assignment_targets(user_id);

-- ── Zuva for teachers ─────────────────────────────────────────────────────
-- Which agent a thread belongs to (the mode column keeps its original values).
ALTER TABLE zuva_threads ADD COLUMN agent TEXT NOT NULL DEFAULT 'tutor';

-- Zuva's reports on a learner, for a teacher (or an admin).
CREATE TABLE student_reports (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,                 -- JSON
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_student_reports ON student_reports(student_id, created_at DESC);

CREATE TABLE lesson_plans (
  id            TEXT PRIMARY KEY,
  teacher_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id  TEXT REFERENCES classrooms(id) ON DELETE SET NULL,
  track_id      TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,               -- JSON
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_lesson_plans_teacher ON lesson_plans(teacher_id, updated_at DESC);

-- ── Traffic (no personal data) ──────────────────────────────────────────────
-- Daily counts only: no IP addresses, no user ids, no cookies. A visitor id is a random
-- value kept for the browser session, stored hashed with the day so days can't be joined.
CREATE TABLE traffic_daily (
  day     TEXT NOT NULL,
  path    TEXT NOT NULL,
  views   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);
CREATE TABLE traffic_dims (
  day     TEXT NOT NULL,
  dim     TEXT NOT NULL CHECK (dim IN ('source','country','device','auth')),
  value   TEXT NOT NULL,
  views   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, dim, value)
);
CREATE TABLE traffic_visitors (
  day     TEXT NOT NULL,
  vid     TEXT NOT NULL,
  PRIMARY KEY (day, vid)
);
