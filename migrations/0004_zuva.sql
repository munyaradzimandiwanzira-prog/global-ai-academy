-- Zuva, the tutor agent: learner profile, long-term memory and conversation threads.
-- Everything is owned by a user and deleted with them (ON DELETE CASCADE).
-- Learners (and parents of child accounts) can see, delete or switch off memory in Settings.

CREATE TABLE zuva_profiles (
  user_id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  interests      TEXT NOT NULL DEFAULT '[]',   -- JSON array of short strings
  goals          TEXT NOT NULL DEFAULT '[]',   -- JSON array of short strings
  learning_style TEXT,
  memory_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE zuva_memories (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('preference','goal','interest','strength','struggle','progress','fact')),
  content      TEXT NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('chat','activity','user')),
  importance   INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT,
  expires_at   TEXT
);
CREATE INDEX idx_zuva_memories_user ON zuva_memories(user_id, created_at DESC);

CREATE TABLE zuva_threads (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL CHECK (mode IN ('kids','learner')),
  title         TEXT NOT NULL DEFAULT 'Chat with Zuva',
  summary       TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_zuva_threads_user ON zuva_threads(user_id, updated_at DESC);

CREATE TABLE zuva_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id  TEXT NOT NULL REFERENCES zuva_threads(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_zuva_messages_thread ON zuva_messages(thread_id, id);
