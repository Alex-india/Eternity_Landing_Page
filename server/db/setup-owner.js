require('../config');
const readline = require('readline/promises');
const { Writable } = require('stream');
const bcrypt = require('bcrypt');
const { pool } = require('./connection');
const { runMigrations } = require('./migrate');
const { ownerEmail } = require('../config');
async function setupOwner() {
  const email = ownerEmail();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === 'demo@eternity.dev') throw new Error('Set OWNER_EMAIL first.');
  let password = process.env.OWNER_PASSWORD;
  if (!password) {
    if (!process.stdin.isTTY) throw new Error('Use an interactive terminal for the password prompt.');
    let muted = false;
    const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
    process.stdout.write('New owner password (12+ characters, hidden): ');
    muted = true;
    password = await rl.question('');
    rl.close();
    process.stdout.write('\n');
  }
  if (password.length < 12 || Buffer.byteLength(password) > 72) throw new Error('Password must be 12+ characters and at most 72 UTF-8 bytes.');
  await runMigrations();
  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(17430861)');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (existing.rows.length > 1) throw new Error('Multiple accounts match OWNER_EMAIL. Resolve these before provisioning.');
    await client.query("UPDATE users SET role = 'member', session_version = session_version + 1 WHERE role = 'owner'");
    if (existing.rows.length) await client.query("UPDATE users SET role = 'owner', password_hash = $1, session_version = session_version + 1, updated_at = NOW() WHERE id = $2", [hash, existing.rows[0].id]);
    else await client.query("INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ('Aryan', 'Owner', $1, $2, 'owner')", [email, hash]);
    await client.query('COMMIT');
    console.log('Owner provisioned. Previous owner sessions revoked. Sign in at /admin/login.');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
if (require.main === module) setupOwner().catch((err) => { console.error(err.message); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { setupOwner };
