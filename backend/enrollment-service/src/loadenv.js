// Loads the project-root .env for local (non-Docker) runs so `node src/index.js`
// works without manually exporting variables. Never overrides variables that are
// already set (so docker-compose's injected env still wins). No dependencies.
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '..', '..', '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
} catch {
  /* no .env file (e.g. running in Docker) — rely on injected env */
}
