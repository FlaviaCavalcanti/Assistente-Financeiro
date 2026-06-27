package sqlite

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"

	_ "modernc.org/sqlite"
)

//go:embed migrations
var migrationsFS embed.FS

type DB struct {
	Conn *sql.DB
}

func New(path string) (*DB, error) {
	conn, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("sqlite: open: %w", err)
	}

	// SQLite não suporta múltiplos escritores simultâneos.
	conn.SetMaxOpenConns(1)

	db := &DB{Conn: conn}
	if err := db.runMigrations(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("sqlite: migrations: %w", err)
	}
	return db, nil
}

func (db *DB) Close() error {
	return db.Conn.Close()
}

func (db *DB) runMigrations() error {
	if _, err := db.Conn.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, run_at TEXT NOT NULL)`); err != nil {
		return fmt.Errorf("sqlite: criar schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return err
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		var count int
		_ = db.Conn.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE filename = ?`, e.Name()).Scan(&count)
		if count > 0 {
			continue
		}
		content, err := migrationsFS.ReadFile("migrations/" + e.Name())
		if err != nil {
			return fmt.Errorf("ler migration %s: %w", e.Name(), err)
		}
		if _, err := db.Conn.Exec(string(content)); err != nil {
			return fmt.Errorf("executar migration %s: %w", e.Name(), err)
		}
		if _, err := db.Conn.Exec(`INSERT INTO schema_migrations (filename, run_at) VALUES (?, datetime('now'))`, e.Name()); err != nil {
			return fmt.Errorf("registrar migration %s: %w", e.Name(), err)
		}
	}
	return nil
}
