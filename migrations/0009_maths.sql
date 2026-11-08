-- Cambridge Maths with Zuva (Stages 1–6). The learner model is the same engine as the English
-- course (worker/esl/model.ts, course = 'maths'), so these tables share the esl_* column layout.
CREATE TABLE IF NOT EXISTS maths_learners (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stage      INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 6),
  age        INTEGER CHECK (age IS NULL OR age BETWEEN 3 AND 99),
  support    TEXT NOT NULL DEFAULT 'off' CHECK (support IN ('off','pt-MZ')),
  voice      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- week = the unit's stage, band = the unit id (so the shared engine needs no special cases)
CREATE TABLE IF NOT EXISTS maths_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id   TEXT,
  week         INTEGER NOT NULL,
  band         TEXT NOT NULL,
  activity_id  TEXT NOT NULL,
  kind         TEXT NOT NULL,
  skill        TEXT NOT NULL,
  item         TEXT NOT NULL,
  correct      INTEGER NOT NULL,
  score        REAL,
  ms           INTEGER,
  tries        INTEGER NOT NULL DEFAULT 1,
  hints        INTEGER NOT NULL DEFAULT 0,
  input        TEXT NOT NULL DEFAULT 'tap' CHECK (input IN ('voice','tap','type','grown-up')),
  heard        TEXT,
  support_used INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_maths_attempts_user ON maths_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maths_attempts_skill ON maths_attempts(user_id, skill);

CREATE TABLE IF NOT EXISTS maths_skills (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, skill TEXT NOT NULL,
  mastery REAL NOT NULL DEFAULT 0.3, attempts INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0,
  avg_ms REAL, streak INTEGER NOT NULL DEFAULT 0, last_at TEXT, PRIMARY KEY (user_id, skill)
);
CREATE TABLE IF NOT EXISTS maths_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, item TEXT NOT NULL, skill TEXT NOT NULL,
  box INTEGER NOT NULL DEFAULT 0, seen INTEGER NOT NULL DEFAULT 0, misses INTEGER NOT NULL DEFAULT 0,
  last_at TEXT, due_at TEXT, PRIMARY KEY (user_id, item)
);
CREATE INDEX IF NOT EXISTS idx_maths_items_due ON maths_items(user_id, due_at);
CREATE TABLE IF NOT EXISTS maths_engagement (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL,
  started INTEGER NOT NULL DEFAULT 0, finished INTEGER NOT NULL DEFAULT 0, replays INTEGER NOT NULL DEFAULT 0,
  quits INTEGER NOT NULL DEFAULT 0, likes INTEGER NOT NULL DEFAULT 0, dislikes INTEGER NOT NULL DEFAULT 0,
  total_ms INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, kind)
);
CREATE TABLE IF NOT EXISTS maths_progress (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id      TEXT NOT NULL,
  done         TEXT NOT NULL DEFAULT '[]',
  stars        INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, unit_id)
);

-- Notes to teachers are shared by both courses.
ALTER TABLE esl_teacher_notes ADD COLUMN course TEXT NOT NULL DEFAULT 'esl' CHECK (course IN ('esl','maths'));
