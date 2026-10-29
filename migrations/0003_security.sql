-- Security hardening: two-step login (TOTP), consent records, account deletion.

-- TOTP secrets are AES-GCM encrypted with the MFA_KEY secret (never stored in plain text).
ALTER TABLE users ADD COLUMN mfa_secret TEXT;
ALTER TABLE users ADD COLUMN mfa_pending_secret TEXT;
ALTER TABLE users ADD COLUMN mfa_enabled_at TEXT;
-- Last accepted 30-second time step, so a code can never be replayed.
ALTER TABLE users ADD COLUMN mfa_last_step INTEGER;
-- When the learner accepted the terms (and, for under-18s, confirmed a guardian agreed).
ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
-- Set when the account has been erased at the learner's request (row kept, personal data scrubbed).
ALTER TABLE users ADD COLUMN deleted_at TEXT;

-- One-use recovery codes, stored as SHA-256 hashes.
CREATE TABLE mfa_recovery_codes (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, code_hash)
);

-- Short-lived "password was right, now enter your code" tickets. No session exists until the code passes.
CREATE TABLE mfa_challenges (
  id         TEXT PRIMARY KEY,               -- SHA-256 of the ticket handed to the browser
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_mfa_challenges_user ON mfa_challenges(user_id);
