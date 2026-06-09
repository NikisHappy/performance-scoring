#!/bin/sh
set -e

echo "Running database seed..."
npx tsx src/db/seed.ts

echo "Starting Next.js..."
npm start
