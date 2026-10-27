-- Global AI Academy — growth features: waitlist, promo codes, trials, scholarships,
-- live class sessions, saved projects (Spaces-style), capstone projects and AI learner reports.
PRAGMA foreign_keys = ON;

-- One free 7-day Plus trial per account.
ALTER TABLE users ADD COLUMN trial_used_at TEXT;

-- Premium (coming soon) and other interest lists.
CREATE TABLE waitlist (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL COLLATE NOCASE,
  name        TEXT NOT NULL DEFAULT '',
  plan        TEXT NOT NULL DEFAULT 'premium',
  note        TEXT NOT NULL DEFAULT '',
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (email, plan)
);
CREATE INDEX idx_waitlist_plan ON waitlist(plan, created_at DESC);

CREATE TABLE promo_codes (
  code          TEXT PRIMARY KEY COLLATE NOCASE,
  percent_off   INTEGER NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  plans         TEXT NOT NULL DEFAULT '["plus","academy"]',   -- JSON array of plan ids
  periods       TEXT NOT NULL DEFAULT '["monthly","yearly"]', -- JSON array
  max_uses      INTEGER,                                       -- NULL = unlimited
  used          INTEGER NOT NULL DEFAULT 0,
  expires_at    TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  description   TEXT NOT NULL DEFAULT '',
  created_by    TEXT REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

ALTER TABLE payments ADD COLUMN promo_code TEXT;
ALTER TABLE payments ADD COLUMN list_price_cents INTEGER;

CREATE TABLE scholarships (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan         TEXT NOT NULL CHECK (plan IN ('plus','academy')),
  label        TEXT NOT NULL,
  reason       TEXT NOT NULL DEFAULT '',
  months       INTEGER NOT NULL,
  starts_at    TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  granted_by   TEXT NOT NULL REFERENCES users(id),
  revoked_at   TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_scholarships_user ON scholarships(user_id);

-- Scheduled live classes (Zoom / Google Meet / Teams link) with AI summaries of the teacher's notes.
CREATE TABLE live_sessions (
  id             TEXT PRIMARY KEY,
  classroom_id   TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  starts_at      TEXT NOT NULL,
  minutes        INTEGER NOT NULL DEFAULT 60,
  meeting_url    TEXT NOT NULL DEFAULT '',
  recording_url  TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  summary        TEXT,                        -- JSON from the AI class summariser
  created_by     TEXT NOT NULL REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_live_sessions_class ON live_sessions(classroom_id, starts_at);

-- Saved code ("Spaces"): learners keep snippets and share them by link.
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  language    TEXT NOT NULL,
  code        TEXT NOT NULL,
  share_slug  TEXT UNIQUE,                    -- NULL = private
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_projects_user ON projects(user_id, updated_at DESC);

CREATE TABLE capstones (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  career_id     TEXT,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL DEFAULT '',
  stack         TEXT NOT NULL DEFAULT '',
  repo_url      TEXT NOT NULL DEFAULT '',
  demo_url      TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','building','review','completed')),
  mentor_id     TEXT REFERENCES users(id),
  feedback      TEXT,
  grade         INTEGER,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_capstones_user ON capstones(user_id);
CREATE INDEX idx_capstones_status ON capstones(status, updated_at DESC);

-- AI learner reports (strengths, gaps and a plan) generated for teachers.
CREATE TABLE learner_reports (
  id            TEXT PRIMARY KEY,
  classroom_id  TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,                -- JSON
  teacher_notes TEXT NOT NULL DEFAULT '',
  created_by    TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_learner_reports ON learner_reports(classroom_id, user_id, created_at DESC);
