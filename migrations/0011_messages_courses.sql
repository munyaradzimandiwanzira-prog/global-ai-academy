-- Messages to learners and parents, parent progress reports, and teacher-built courses.

-- Parents and guardians who get a learner's class announcements and progress reports by email.
-- Added by the learner (Settings) or one of their teachers; the learner can see and remove them,
-- and every email carries a one-click unsubscribe.
CREATE TABLE IF NOT EXISTS guardians (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  relation        TEXT NOT NULL DEFAULT 'parent' CHECK (relation IN ('parent','guardian','other')),
  added_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  unsub_token     TEXT NOT NULL UNIQUE,
  unsubscribed_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (student_id, email)
);
CREATE INDEX IF NOT EXISTS idx_guardians_student ON guardians(student_id);

-- (The older `announcements` table is the classroom wall; class-wide messages are mirrored there.)
CREATE TABLE IF NOT EXISTS teacher_messages (
  id            TEXT PRIMARY KEY,
  teacher_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id  TEXT REFERENCES classrooms(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  to_parents    INTEGER NOT NULL DEFAULT 0,
  learners      INTEGER NOT NULL DEFAULT 0,
  parent_emails INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_teacher_messages_teacher ON teacher_messages(teacher_id, created_at DESC);

CREATE TABLE IF NOT EXISTS teacher_message_targets (
  message_id      TEXT NOT NULL REFERENCES teacher_messages(id) ON DELETE CASCADE,
  student_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TEXT,
  PRIMARY KEY (message_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_message_targets_student ON teacher_message_targets(student_id);

-- A snapshot report for parents, opened from an unguessable link that expires.
CREATE TABLE IF NOT EXISTS parent_reports (
  id          TEXT PRIMARY KEY,
  token       TEXT NOT NULL UNIQUE,
  teacher_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  sent_to     INTEGER NOT NULL DEFAULT 0,
  sent_at     TEXT,
  viewed_at   TEXT,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_parent_reports_student ON parent_reports(student_id, created_at DESC);

-- Teacher-built courses: course → units → lessons (Markdown, optional video, an auto-marked check).
CREATE TABLE IF NOT EXISTS teacher_courses (
  id           TEXT PRIMARY KEY,
  teacher_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL DEFAULT '',
  subject      TEXT NOT NULL DEFAULT '',
  audience     TEXT NOT NULL DEFAULT '',
  color        TEXT NOT NULL DEFAULT 'teal' CHECK (color IN ('teal','gold','ink','clay')),
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_teacher_courses_teacher ON teacher_courses(teacher_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS teacher_units (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES teacher_courses(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_teacher_units_course ON teacher_units(course_id, position);

CREATE TABLE IF NOT EXISTS teacher_lessons (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES teacher_courses(id) ON DELETE CASCADE,
  unit_id    TEXT NOT NULL REFERENCES teacher_units(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  video_url  TEXT,
  minutes    INTEGER NOT NULL DEFAULT 15,
  checks     TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_teacher_lessons_unit ON teacher_lessons(unit_id, position);

-- Who can open a course: whole classes (new members get it too) or chosen learners.
CREATE TABLE IF NOT EXISTS teacher_course_classes (
  course_id    TEXT NOT NULL REFERENCES teacher_courses(id) ON DELETE CASCADE,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, classroom_id)
);
CREATE TABLE IF NOT EXISTS teacher_course_learners (
  course_id  TEXT NOT NULL REFERENCES teacher_courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_course_learners_student ON teacher_course_learners(student_id);

CREATE TABLE IF NOT EXISTS teacher_lesson_progress (
  lesson_id  TEXT NOT NULL REFERENCES teacher_lessons(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  TEXT NOT NULL REFERENCES teacher_courses(id) ON DELETE CASCADE,
  score      INTEGER,
  max_score  INTEGER,
  answers    TEXT NOT NULL DEFAULT '{}',
  done_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (lesson_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON teacher_lesson_progress(course_id, student_id);
