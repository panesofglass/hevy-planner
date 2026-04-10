-- Benchmark result logging: stores user-recorded measurements per benchmark
CREATE TABLE IF NOT EXISTS benchmark_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  program_id INTEGER NOT NULL,
  benchmark_id TEXT NOT NULL,
  value TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  side TEXT,
  notes TEXT,
  tested_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_benchmark_results_lookup
  ON benchmark_results(user_id, program_id, benchmark_id, tested_at DESC);
