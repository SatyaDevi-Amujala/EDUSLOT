// Creates the database (if missing) and applies db/schema.sql — a psql-free
// replacement for `psql -f db/schema.sql`.
//   node db/migrate.js
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      if (!(t.slice(0, i).trim() in env)) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch { /* ignore */ }
  return env;
}

const env = loadEnv();
const cfg = {
  host: 'localhost',
  port: Number(env.DB_PORT || 5432),
  user: env.DB_USER || 'postgres',
  password: env.DB_PASSWORD,
};
const dbName = env.DB_NAME || 'ProjectA';

async function main() {
  // 1. Ensure the database exists (connect to the default 'postgres' db first).
  const admin = new pg.Client({ ...cfg, database: 'postgres' });
  await admin.connect();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rows[0]) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[migrate] created database "${dbName}"`);
  } else {
    console.log(`[migrate] database "${dbName}" already exists`);
  }
  await admin.end();

  // 2. Apply the schema (idempotent).
  const client = new pg.Client({ ...cfg, database: dbName });
  await client.connect();
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await client.query(sql);
  await client.end();
  console.log('[migrate] schema applied — all tables are ready.');
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  console.error('  → Is PostgreSQL running on localhost:5432 with the user/password in .env?');
  process.exit(1);
});
