PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#6B7280',
    icon        TEXT NOT NULL DEFAULT '',
    is_system   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS income_sources (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    kind          TEXT NOT NULL CHECK(kind IN ('recurring', 'one_time')),
    gross_cents   INTEGER NOT NULL DEFAULT 0,
    net_cents     INTEGER NOT NULL CHECK(net_cents > 0),
    recurrence    TEXT NOT NULL CHECK(recurrence IN ('monthly', 'weekly', 'biweekly', 'none')),
    day_of_month  INTEGER NOT NULL DEFAULT 0,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
    id             TEXT PRIMARY KEY,
    description    TEXT NOT NULL,
    amount_cents   INTEGER NOT NULL CHECK(amount_cents > 0),
    kind           TEXT NOT NULL CHECK(kind IN ('fixed', 'variable')),
    category_id    TEXT NOT NULL REFERENCES categories(id),
    recurrence     TEXT NOT NULL CHECK(recurrence IN ('monthly', 'none')),
    day_of_month   INTEGER NOT NULL DEFAULT 0,
    active         INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debts (
    id                       TEXT PRIMARY KEY,
    name                     TEXT NOT NULL,
    kind                     TEXT NOT NULL CHECK(kind IN ('credit_card', 'loan')),
    limit_cents              INTEGER NOT NULL DEFAULT 0,
    current_balance_cents    INTEGER NOT NULL DEFAULT 0,
    minimum_payment_cents    INTEGER NOT NULL DEFAULT 0,
    closing_day              INTEGER NOT NULL DEFAULT 0,
    principal_cents          INTEGER NOT NULL DEFAULT 0,
    remaining_balance_cents  INTEGER NOT NULL DEFAULT 0,
    monthly_payment_cents    INTEGER NOT NULL DEFAULT 0,
    total_installments       INTEGER NOT NULL DEFAULT 0,
    paid_installments        INTEGER NOT NULL DEFAULT 0,
    interest_rate_bps        INTEGER NOT NULL DEFAULT 0 CHECK(interest_rate_bps >= 0),
    due_day                  INTEGER NOT NULL CHECK(due_day BETWEEN 1 AND 31),
    active                   INTEGER NOT NULL DEFAULT 1,
    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS installment_plans (
    id                        TEXT PRIMARY KEY,
    description               TEXT NOT NULL,
    debt_id                   TEXT NOT NULL REFERENCES debts(id),
    category_id               TEXT NOT NULL REFERENCES categories(id),
    total_cents               INTEGER NOT NULL CHECK(total_cents > 0),
    installment_amount_cents  INTEGER NOT NULL CHECK(installment_amount_cents > 0),
    total_installments        INTEGER NOT NULL CHECK(total_installments > 0),
    paid_installments         INTEGER NOT NULL DEFAULT 0,
    first_due_date            TEXT NOT NULL,
    active                    INTEGER NOT NULL DEFAULT 1,
    created_at                TEXT NOT NULL,
    updated_at                TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id           TEXT PRIMARY KEY,
    date         TEXT NOT NULL,
    description  TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
    direction    TEXT NOT NULL CHECK(direction IN ('credit', 'debit')),
    category_id  TEXT NOT NULL DEFAULT '',
    source_kind  TEXT NOT NULL DEFAULT '',
    source_id    TEXT NOT NULL DEFAULT '',
    note         TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source   ON transactions(source_kind, source_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category     ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_installment_debt      ON installment_plans(debt_id);
CREATE INDEX IF NOT EXISTS idx_income_active         ON income_sources(active);
CREATE INDEX IF NOT EXISTS idx_expenses_active       ON expenses(active);
CREATE INDEX IF NOT EXISTS idx_debts_active          ON debts(active);
