/* ============================================================
   ETERNITY — Database Migration Runner
   Reads schema.sql and executes it against the database.
   Also seeds the demo user if not already present.
   ============================================================ */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { pool, query } = require('./connection');

const SALT_ROUNDS = 12;

async function runMigrations() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   ETERNITY — Database Migration      ║');
  console.log('╚══════════════════════════════════════╝\n');

  try {
    // 1. Test connection
    console.log('→ Testing database connection...');
    const connResult = await query('SELECT NOW() AS server_time');
    console.log(`  ✓ Connected to PostgreSQL (server time: ${connResult.rows[0].server_time})\n`);

    // 2. Run schema.sql
    console.log('→ Running schema migrations...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await query(schemaSql);
    console.log('  ✓ Schema applied successfully\n');

    // 3. Verify tables exist
    console.log('→ Verifying tables...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'inquiries', 'bookings')
      ORDER BY table_name
    `);
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`  ✓ Found tables: ${tables.join(', ')}\n`);

    if (!tables.includes('users') || !tables.includes('inquiries') || !tables.includes('bookings')) {
      throw new Error('Missing required tables! Expected: users, inquiries, bookings');
    }

    // 4. Seed demo user
    console.log('→ Seeding demo user...');
    const existingDemo = await query(
      'SELECT id FROM users WHERE email = $1',
      ['demo@eternity.dev']
    );

    if (existingDemo.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Password123!', SALT_ROUNDS);
      await query(
        `INSERT INTO users (first_name, last_name, email, password_hash) 
         VALUES ($1, $2, $3, $4)`,
        ['Alex', 'Morgan', 'demo@eternity.dev', hashedPassword]
      );
      console.log('  ✓ Demo user created (demo@eternity.dev / Password123!)\n');
    } else {
      console.log('  ✓ Demo user already exists\n');
    }

    // 5. Print summary
    const userCount = await query('SELECT COUNT(*) FROM users');
    const inquiryCount = await query('SELECT COUNT(*) FROM inquiries');
    const bookingCount = await query('SELECT COUNT(*) FROM bookings');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   Migration Complete                 ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║   Users:     ${String(userCount.rows[0].count).padEnd(22)} ║`);
    console.log(`║   Inquiries: ${String(inquiryCount.rows[0].count).padEnd(22)} ║`);
    console.log(`║   Bookings:  ${String(bookingCount.rows[0].count).padEnd(22)} ║`);
    console.log('╚══════════════════════════════════════╝\n');

  } catch (err) {
    console.error('\n  ✗ Migration failed:', err.message);
    if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
      console.error('\n  → Check your DATABASE_URL in .env');
      console.error('  → Make sure your Neon project is active at https://console.neon.tech\n');
    }
    throw err;
  }
}

// Run directly if called as: node db/migrate.js
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Done. Exiting.\n');
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { runMigrations };
