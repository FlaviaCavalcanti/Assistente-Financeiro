-- Torna debt_id opcional em installment_plans (permite parcelamentos sem cartão).
-- SQLite não suporta DROP CONSTRAINT; recriamos a tabela.

PRAGMA foreign_keys = OFF;

CREATE TABLE installment_plans_new (
    id                        TEXT    PRIMARY KEY,
    description               TEXT    NOT NULL,
    debt_id                   TEXT,   -- nullable: NULL = sem cartão
    category_id               TEXT    NOT NULL REFERENCES categories(id),
    total_cents               INTEGER NOT NULL CHECK(total_cents > 0),
    installment_amount_cents  INTEGER NOT NULL CHECK(installment_amount_cents > 0),
    total_installments        INTEGER NOT NULL CHECK(total_installments > 0),
    paid_installments         INTEGER NOT NULL DEFAULT 0,
    first_due_date            TEXT    NOT NULL,
    active                    INTEGER NOT NULL DEFAULT 1,
    created_at                TEXT    NOT NULL,
    updated_at                TEXT    NOT NULL
);

INSERT INTO installment_plans_new
SELECT id, description, NULLIF(debt_id,''), category_id,
       total_cents, installment_amount_cents, total_installments, paid_installments,
       first_due_date, active, created_at, updated_at
FROM installment_plans;

DROP TABLE installment_plans;
ALTER TABLE installment_plans_new RENAME TO installment_plans;

PRAGMA foreign_keys = ON;
