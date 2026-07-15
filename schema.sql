-- SQLite/Turso schema for Balls and Money leaderboard
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS leaderboard_players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS leaderboard_scores (
  player_id TEXT PRIMARY KEY REFERENCES leaderboard_players(id) ON DELETE CASCADE,
  prestige INTEGER NOT NULL DEFAULT 0 CHECK (prestige >= 0),
  money INTEGER NOT NULL DEFAULT 0 CHECK (money >= 0),
  balls INTEGER NOT NULL DEFAULT 0 CHECK (balls >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_rank
ON leaderboard_scores (prestige DESC, money DESC, balls DESC, updated_at ASC);
