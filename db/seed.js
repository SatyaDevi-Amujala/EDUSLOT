// Reseeds users (bcrypt-hashed passwords). Run:  node db/seed.js
// Reads DB creds from the .env file in the project root.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

function loadEnv() {
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const client = new pg.Client({
  host: 'localhost',
  port: Number(env.DB_PORT || 5432),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

const DEFAULT_PASSWORD = 'password123';

const USERS = [
  { name: 'Admin Root',     email: 'admin@example.com',   role: 'admin' },
  { name: 'Manager Suresh', email: 'manager@example.com', role: 'staff' },
  { name: 'Alice Sharma',   email: 'alice@example.com',   role: 'student' },
  { name: 'Bharath Kumar',  email: 'bharath@example.com', role: 'student' },
  { name: 'Chitra Reddy',   email: 'chitra@example.com',  role: 'student' },
  { name: 'Deepak Verma',   email: 'deepak@example.com',  role: 'student' },
  { name: 'Esha Iyer',      email: 'esha@example.com',    role: 'student' },
  { name: 'Farhan Ali',     email: 'farhan@example.com',  role: 'student' },
];

async function main() {
  await client.connect();
  console.log('[seed] connected to', env.DB_NAME);

  await client.query('TRUNCATE TABLE enrollments, users RESTART IDENTITY CASCADE');
  console.log('[seed] truncated enrollments + users');

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  console.log(`[seed] hashed default password ("${DEFAULT_PASSWORD}")`);

  for (const u of USERS) {
    await client.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [u.name, u.email, hash, u.role],
    );
  }
  console.log(`[seed] inserted ${USERS.length} users`);

  await client.end();
  console.log('[seed] done. Default password for all users: password123');
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
