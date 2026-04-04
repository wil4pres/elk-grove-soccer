-- Elk Grove Soccer: Player-Team Matching Database
-- SQLite schema for coordinator team assignment suggestions

-- Seasons reference table
CREATE TABLE IF NOT EXISTS seasons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,   -- e.g. "Fall Recreation 2024", "Fall Recreation 2025"
  year        INTEGER,                -- e.g. 2024, 2025
  is_current  INTEGER DEFAULT 0       -- 1 = the season being assigned right now
);

-- Teams (one row per team per season)
CREATE TABLE IF NOT EXISTS teams (
  id          INTEGER PRIMARY KEY,    -- team_id from PlayMetrics
  name        TEXT NOT NULL,          -- e.g. "2012B Destroyers (Bailey)"
  season_id   INTEGER REFERENCES seasons(id),
  gender      TEXT,                   -- M/F derived from team name
  birth_year  INTEGER,                -- e.g. 2012, derived from team name
  coach       TEXT,                   -- parsed from team name, e.g. "Bailey"
  UNIQUE(id, season_id)
);

-- Players master table (one row per unique player across all seasons)
CREATE TABLE IF NOT EXISTS players (
  id                    INTEGER PRIMARY KEY,  -- player_id from PlayMetrics
  first_name            TEXT,
  last_name             TEXT,
  gender                TEXT,
  birth_date            TEXT,
  account_email         TEXT,         -- parent/guardian email (used for sibling detection)
  account_first_name    TEXT,
  account_last_name     TEXT,
  account_phone         TEXT,
  street                TEXT,
  city                  TEXT,
  state                 TEXT,
  zip                   TEXT
);

-- Registrations: one row per player per season (form submission data)
CREATE TABLE IF NOT EXISTS registrations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id             INTEGER NOT NULL REFERENCES players(id),
  season_id             INTEGER NOT NULL REFERENCES seasons(id),
  package_name          TEXT,         -- e.g. "2012 Boys", "2013 Girls"
  school_and_grade      TEXT,         -- "School and Grade Fall 2025" field
  special_request       TEXT,         -- "Special Request - Team/Coach/Player" field
  new_or_returning      TEXT,         -- "New or Returning Player"
  registered_on         TEXT,
  status                TEXT,
  volunteer_head_coach  INTEGER DEFAULT 0,  -- 1 if parent volunteered as HC
  volunteer_asst_coach  INTEGER DEFAULT 0,  -- 1 if parent volunteered as AC
  UNIQUE(player_id, season_id)
);

-- Team assignments: which player was on which team in which season
CREATE TABLE IF NOT EXISTS team_assignments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       INTEGER NOT NULL REFERENCES players(id),
  team_id         INTEGER NOT NULL REFERENCES teams(id),
  season_id       INTEGER NOT NULL REFERENCES seasons(id),
  assignment_status TEXT,             -- "Accepted", "Declined", etc.
  tryout_note     TEXT,               -- coach notes from tryout
  UNIQUE(player_id, season_id)
);

-- Coaches: one row per coach per team per season
CREATE TABLE IF NOT EXISTS coaches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER,
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT,
  mobile_number   TEXT,
  team_id         INTEGER,
  team_name       TEXT,
  season          TEXT,
  role            TEXT    -- "Head Coach" or "Assistant Coach"
);

CREATE INDEX IF NOT EXISTS idx_coaches_last   ON coaches(last_name);
CREATE INDEX IF NOT EXISTS idx_coaches_first  ON coaches(first_name);
CREATE INDEX IF NOT EXISTS idx_coaches_team   ON coaches(team_name);

-- AI-extracted structured data from free-text special requests
CREATE TABLE IF NOT EXISTS request_extractions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id     INTEGER NOT NULL,
  season_id     INTEGER NOT NULL,
  raw_request   TEXT,
  coaches       TEXT DEFAULT '[]',   -- JSON array: ["Tim O'Brien", "Martinez"]
  friends       TEXT DEFAULT '[]',   -- JSON array: ["Emma Johnson", "Jake"]
  teams         TEXT DEFAULT '[]',   -- JSON array: ["Pink Panthers", "Firestorm"]
  notes         TEXT DEFAULT '',     -- anything else the model flagged
  model         TEXT,                -- which model was used
  extracted_at  TEXT,
  UNIQUE(player_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_extractions_player ON request_extractions(player_id);
CREATE INDEX IF NOT EXISTS idx_extractions_season ON request_extractions(season_id);

-- Indexes for fast matching lookups
CREATE INDEX IF NOT EXISTS idx_players_email      ON players(account_email);
CREATE INDEX IF NOT EXISTS idx_players_zip        ON players(zip);
CREATE INDEX IF NOT EXISTS idx_reg_season         ON registrations(season_id);
CREATE INDEX IF NOT EXISTS idx_reg_special_req    ON registrations(special_request);
CREATE INDEX IF NOT EXISTS idx_assign_season      ON team_assignments(season_id);
CREATE INDEX IF NOT EXISTS idx_assign_player      ON team_assignments(player_id);
CREATE INDEX IF NOT EXISTS idx_assign_team        ON team_assignments(team_id);
