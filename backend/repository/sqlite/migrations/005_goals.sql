CREATE TABLE IF NOT EXISTS goals (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    kind          TEXT    NOT NULL CHECK(kind IN ('emergency_fund', 'purchase')),
    target_cents  INTEGER NOT NULL DEFAULT 0,
    target_months INTEGER NOT NULL DEFAULT 0,
    current_cents INTEGER NOT NULL DEFAULT 0,
    deadline      TEXT    NOT NULL DEFAULT '',
    icon          TEXT    NOT NULL DEFAULT 'target',
    color         TEXT    NOT NULL DEFAULT '#818CF8',
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);
