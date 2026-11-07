-- English as a Second Language course and Zuva's learner model.
--
-- Zuva's memory, layer by layer (everything belongs to one user and is deleted with them):
--   working     the current game and the last ten chat messages (request + zuva_messages)
--   episodic    esl_attempts (every answer, with time taken and hints) and esl_sessions (a short
--               summary of each sitting), plus zuva_threads.summary
--   semantic    zuva_memories and zuva_profiles (who the learner is, interests, preferences)
--               and esl_learners (age band, accent, current week)
--   skill       esl_skills (mastery per skill), esl_items (spaced review per word or pattern)
--               and esl_engagement (what they finish, replay, skip or say they enjoy)

CREATE TABLE IF NOT EXISTS esl_learners (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  band       TEXT NOT NULL CHECK (band IN ('tiny','little','starters','movers','flyers','key','preliminary','first')),
  accent     TEXT NOT NULL DEFAULT 'gb' CHECK (accent IN ('gb','us')),
  age        INTEGER CHECK (age IS NULL OR age BETWEEN 2 AND 99),
  week       INTEGER NOT NULL DEFAULT 1 CHECK (week BETWEEN 1 AND 36),
  voice      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS esl_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT,
  week        INTEGER NOT NULL,
  band        TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  kind        TEXT NOT NULL,
  skill       TEXT NOT NULL,
  item        TEXT NOT NULL,
  correct     INTEGER NOT NULL,
  score       REAL,
  ms          INTEGER,
  tries       INTEGER NOT NULL DEFAULT 1,
  hints       INTEGER NOT NULL DEFAULT 0,
  input       TEXT NOT NULL DEFAULT 'tap' CHECK (input IN ('voice','tap','type','grown-up')),
  heard       TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_esl_attempts_user ON esl_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_esl_attempts_skill ON esl_attempts(user_id, skill);

CREATE TABLE IF NOT EXISTS esl_skills (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill     TEXT NOT NULL,
  mastery   REAL NOT NULL DEFAULT 0.3,
  attempts  INTEGER NOT NULL DEFAULT 0,
  correct   INTEGER NOT NULL DEFAULT 0,
  avg_ms    REAL,
  streak    INTEGER NOT NULL DEFAULT 0,
  last_at   TEXT,
  PRIMARY KEY (user_id, skill)
);

CREATE TABLE IF NOT EXISTS esl_items (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item     TEXT NOT NULL,
  skill    TEXT NOT NULL,
  box      INTEGER NOT NULL DEFAULT 0,
  seen     INTEGER NOT NULL DEFAULT 0,
  misses   INTEGER NOT NULL DEFAULT 0,
  last_at  TEXT,
  due_at   TEXT,
  PRIMARY KEY (user_id, item)
);
CREATE INDEX IF NOT EXISTS idx_esl_items_due ON esl_items(user_id, due_at);

CREATE TABLE IF NOT EXISTS esl_engagement (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind      TEXT NOT NULL,
  started   INTEGER NOT NULL DEFAULT 0,
  finished  INTEGER NOT NULL DEFAULT 0,
  replays   INTEGER NOT NULL DEFAULT 0,
  quits     INTEGER NOT NULL DEFAULT 0,
  likes     INTEGER NOT NULL DEFAULT 0,
  dislikes  INTEGER NOT NULL DEFAULT 0,
  total_ms  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, kind)
);

CREATE TABLE IF NOT EXISTS esl_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week       INTEGER NOT NULL,
  band       TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ended_at   TEXT,
  stats      TEXT NOT NULL DEFAULT '{}',
  summary    TEXT
);
CREATE INDEX IF NOT EXISTS idx_esl_sessions_user ON esl_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS esl_progress (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week         INTEGER NOT NULL,
  band         TEXT NOT NULL,
  done         TEXT NOT NULL DEFAULT '[]',
  stars        INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, week, band)
);

-- Games Zuva designed for one learner (checked before they are saved).
CREATE TABLE IF NOT EXISTS esl_generated (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week       INTEGER NOT NULL,
  spec       TEXT NOT NULL,
  played     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_esl_generated_user ON esl_generated(user_id, created_at DESC);

-- What Zuva tells a learner's teachers.
CREATE TABLE IF NOT EXISTS esl_teacher_notes (
  id         TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area       TEXT NOT NULL,
  note       TEXT NOT NULL,
  suggestion TEXT NOT NULL DEFAULT '',
  source     TEXT NOT NULL DEFAULT 'zuva' CHECK (source IN ('zuva','weekly')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_esl_notes_student ON esl_teacher_notes(student_id, created_at DESC);

-- Generated speech and pictures, kept so each is paid for once.
CREATE TABLE IF NOT EXISTS media_cache (
  key         TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('tts','image','text')),
  mime        TEXT NOT NULL,
  bytes       BLOB NOT NULL,
  size        INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_hit_at TEXT,
  hits        INTEGER NOT NULL DEFAULT 0
);
