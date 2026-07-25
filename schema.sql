-- SQLite/Turso schema for Balls and Money user accounts and leaderboard
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  profile_emoji TEXT NOT NULL DEFAULT '🙂',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS leaderboard_scores (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prestige INTEGER NOT NULL DEFAULT 0 CHECK (prestige >= 0),
  money INTEGER NOT NULL DEFAULT 0 CHECK (money >= 0),
  balls INTEGER NOT NULL DEFAULT 0 CHECK (balls >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_rank
ON leaderboard_scores (prestige DESC, money DESC, balls DESC, updated_at ASC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
