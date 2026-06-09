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

echo "Starting Next.js..."
npm start
