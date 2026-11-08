-- Teacher-made homework, tests and exams, marked automatically (long answers get an AI-suggested
-- mark the teacher can change), with every mark recorded for the gradebook.
CREATE TABLE IF NOT EXISTS teacher_tests (
  id             TEXT PRIMARY KEY,
  teacher_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id   TEXT REFERENCES classrooms(id) ON DELETE SET NULL,
  kind           TEXT NOT NULL DEFAULT 'test' CHECK (kind IN ('homework','test','exam')),
  title          TEXT NOT NULL,
  instructions   TEXT NOT NULL DEFAULT '',
  questions      TEXT NOT NULL DEFAULT '[]',
  total_marks    INTEGER NOT NULL DEFAULT 0,
  time_limit_min INTEGER CHECK (time_limit_min IS NULL OR time_limit_min BETWEEN 1 AND 300),
  due_at         TEXT,
  show_answers   INTEGER NOT NULL DEFAULT 1,
  published_at   TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_tests_teacher ON teacher_tests(teacher_id, created_at DESC);

CREATE TABLE IF NOT EXISTS teacher_test_targets (
  test_id    TEXT NOT NULL REFERENCES teacher_tests(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (test_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_test_targets_student ON teacher_test_targets(student_id);

CREATE TABLE IF NOT EXISTS test_attempts (
  id              TEXT PRIMARY KEY,
  test_id         TEXT NOT NULL REFERENCES teacher_tests(id) ON DELETE CASCADE,
  student_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','submitted','marked')),
  answers         TEXT NOT NULL DEFAULT '{}',
  marks           TEXT NOT NULL DEFAULT '{}',
  score           REAL,
  max_score       REAL,
  late            INTEGER NOT NULL DEFAULT 0,
  teacher_comment TEXT,
  started_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  submitted_at    TEXT,
  marked_at       TEXT,
  UNIQUE (test_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON test_attempts(student_id, submitted_at DESC);
