/* ============================================================
   ETERNITY — PostgreSQL Connection Pool
   Uses node-postgres (pg) with Neon SSL configuration
   ============================================================ */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon serverless
  },
  max: 10,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout connecting after 10s
});

// Log connection events (useful for debugging)
pool.on('connect', () => {
  console.log('  ✓ New PostgreSQL connection established');
});

pool.on('error', (err) => {
  console.error('  ✗ Unexpected PostgreSQL error:', err.message);
});

/**
 * Execute a parameterized query against the pool.
 * @param {string} text - SQL query with $1, $2, ... placeholders
 * @param {any[]} params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  // Log slow queries (> 500ms) for debugging
  if (duration > 500) {
    console.warn(`  ⚠ Slow query (${duration}ms):`, text.substring(0, 80));
  }

  return result;
}

/**
 * Get a client from the pool for transactions.
 * Remember to call client.release() when done.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient };
