require('../config');
const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');
async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(17430861)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const legacy = await client.query("SELECT name FROM schema_migrations WHERE name = '000_legacy_schema'");
    if (!legacy.rows.length) {
      await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
      await client.query("INSERT INTO schema_migrations (name) VALUES ('000_legacy_schema')");
    }
    const dir = path.join(__dirname, 'migrations');
    for (const name of fs.readdirSync(dir).filter((name) => /^\d+.*\.sql$/.test(name)).sort()) {
      const applied = await client.query('SELECT name FROM schema_migrations WHERE name = $1', [name]);
      if (applied.rows.length) continue;
      await client.query(fs.readFileSync(path.join(dir, name), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      console.log('[migration] Applied', name);
    }
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
if (require.main === module) runMigrations().catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { runMigrations };
