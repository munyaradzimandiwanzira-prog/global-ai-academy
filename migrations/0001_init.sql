-- Global AI Academy — initial schema (Cloudflare D1 / SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email_verified_at TEXT,
  password_hash    TEXT NOT NULL,
  name             TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  plan             TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','plus','academy')),
  plan_expires_at  TEXT,
  level            TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('kids','beginner','intermediate','advanced')),
  city             TEXT,
  school           TEXT,
  bio              TEXT,
  avatar_color     TEXT NOT NULL DEFAULT '#23807F',
  xp               INTEGER NOT NULL DEFAULT 0,
  streak           INTEGER NOT NULL DEFAULT 0,
  last_active_day  TEXT,
  last_lesson      TEXT,
  disabled_at      TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,              -- SHA-256 of the cookie token
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  user_agent  TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE email_tokens (
  id          TEXT PRIMARY KEY,              -- SHA-256 of the emailed token
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('verify','reset')),
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_email_tokens_user ON email_tokens(user_id, purpose);

CREATE TABLE progress (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id     TEXT NOT NULL,
  lesson_slug  TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('started','completed')),
  completed_at TEXT,
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, track_id, lesson_slug)
);
CREATE INDEX idx_progress_user_updated ON progress(user_id, updated_at DESC);
CREATE INDEX idx_progress_completed ON progress(user_id, completed_at);

CREATE TABLE activity (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('exercise','challenge','quiz','kids')),
  ref_id      TEXT NOT NULL,
  track_id    TEXT,
  passed      INTEGER NOT NULL DEFAULT 0,
  score       REAL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_code   TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, kind, ref_id)
);

CREATE TABLE xp_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, source, source_id)
);
CREATE INDEX idx_xp_user_created ON xp_events(user_id, created_at);

CREATE TABLE goals (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('lessons_per_week','finish_track','minutes_per_day')),
  target       INTEGER NOT NULL,
  track_id     TEXT,
  deadline     TEXT,
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_goals_user ON goals(user_id);

CREATE TABLE exam_attempts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id      TEXT NOT NULL,
  question_ids  TEXT NOT NULL,                -- JSON array
  score         REAL,
  passed        INTEGER,
  started_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  submitted_at  TEXT
);
CREATE INDEX idx_exam_user_track ON exam_attempts(user_id, track_id, started_at DESC);

CREATE TABLE certificates (
  id          TEXT PRIMARY KEY,               -- public verification code
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  score       REAL NOT NULL,
  issued_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, track_id)
);

CREATE TABLE classrooms (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  level        TEXT NOT NULL DEFAULT 'beginner',
  track_ids    TEXT NOT NULL DEFAULT '[]',     -- JSON array
  teacher_id   TEXT NOT NULL REFERENCES users(id),
  join_code    TEXT NOT NULL UNIQUE,
  archived_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_classrooms_teacher ON classrooms(teacher_id);

CREATE TABLE classroom_members (
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (classroom_id, user_id)
);
CREATE INDEX idx_members_user ON classroom_members(user_id);

CREATE TABLE assignments (
  id            TEXT PRIMARY KEY,
  classroom_id  TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  instructions  TEXT NOT NULL,
  language      TEXT NOT NULL DEFAULT 'python',
  starter_code  TEXT NOT NULL DEFAULT '',
  rubric        TEXT NOT NULL DEFAULT '',
  due_at        TEXT,
  max_score     INTEGER NOT NULL DEFAULT 100,
  created_by    TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_assignments_class ON assignments(classroom_id, created_at DESC);

CREATE TABLE submissions (
  id               TEXT PRIMARY KEY,
  assignment_id    TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code             TEXT NOT NULL DEFAULT '',
  text             TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','graded')),
  score            REAL,
  ai_feedback      TEXT,                       -- JSON
  teacher_feedback TEXT,
  submitted_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  graded_at        TEXT,
  UNIQUE (assignment_id, user_id)
);
CREATE INDEX idx_submissions_user ON submissions(user_id);

CREATE TABLE announcements (
  id            TEXT PRIMARY KEY,
  classroom_id  TEXT REFERENCES classrooms(id) ON DELETE CASCADE,  -- NULL = everyone
  author_id     TEXT NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_announcements_class ON announcements(classroom_id, created_at DESC);

CREATE TABLE messages (
  id            TEXT PRIMARY KEY,
  classroom_id  TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_messages_class ON messages(classroom_id, created_at DESC);

CREATE TABLE teacher_requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by  TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  reviewed_at  TEXT
);
CREATE INDEX idx_teacher_requests_status ON teacher_requests(status, created_at);

CREATE TABLE payments (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  provider      TEXT NOT NULL,                 -- paynow | manual
  reference     TEXT NOT NULL UNIQUE,
  plan          TEXT NOT NULL,
  period        TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | cancelled
  poll_url      TEXT,
  provider_ref  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);

CREATE TABLE rate_limits (
  key          TEXT NOT NULL,
  window       TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  expires_at   INTEGER NOT NULL,             -- unix seconds
  PRIMARY KEY (key, window)
);
CREATE INDEX idx_rate_limits_expiry ON rate_limits(expires_at);

CREATE TABLE contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  handled_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    TEXT,
  action      TEXT NOT NULL,
  target      TEXT,
  meta        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
