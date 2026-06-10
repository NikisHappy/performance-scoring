#!/bin/sh
set -e

echo "Checking database..."
# Only seed if users table doesn't exist or is empty
NEEDS_SEED=$(node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\"SELECT COUNT(*) FROM users\")
  .then(r => { console.log(r.rows[0].count === '0' ? 'yes' : 'no'); pool.end(); })
  .catch(() => { console.log('yes'); pool.end(); });
" 2>/dev/null || echo "yes")

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "Database empty, running seed..."
  npx tsx src/db/seed.ts
else
  echo "Database already has data, skipping seed."
fi

# Idempotent migrations for existing databases (seed only runs on empty DB).
echo "Applying lightweight migrations..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const stmts = [
  'CREATE TABLE IF NOT EXISTS period_status (id SERIAL PRIMARY KEY, month TEXT NOT NULL UNIQUE, is_open BOOLEAN DEFAULT TRUE)',
  'ALTER TABLE period_status ADD COLUMN IF NOT EXISTS name TEXT',
  'ALTER TABLE period_status ADD COLUMN IF NOT EXISTS start_date TEXT',
  'ALTER TABLE period_status ADD COLUMN IF NOT EXISTS end_date TEXT',
  'ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_date TEXT',
  'ALTER TABLE employees ADD COLUMN IF NOT EXISTS removed_at TEXT'
];
(async () => {
  for (const s of stmts) { try { await pool.query(s); } catch (e) { console.error('migration warn:', e.message); } }
  await pool.end();
})();
" 2>/dev/null || echo "Migration step skipped."

echo "Starting Next.js..."
npm start
