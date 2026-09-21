/* ============================================================
   ETERNITY — Express API Server
   Main entry point. Loads middleware, mounts routes, runs
   database migrations on startup, and starts listening.
   ============================================================ */

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { runMigrations } = require('./db/migrate');
const authRoutes = require('./routes/auth');
const inquiryRoutes = require('./routes/inquiries');
const calRoutes = require('./routes/cal');

const app = express();
const PORT = process.env.PORT || 3000;

/* ─── Startup Validation ─── */

function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n  ✗ Missing required environment variables:');
    missing.forEach((key) => console.error(`    - ${key}`));
    console.error('\n  → Copy .env.example to .env and fill in your values.\n');
    process.exit(1);
  }

  if (process.env.JWT_SECRET === 'change-this-to-a-random-secret-key-at-least-32-chars') {
    console.warn('\n  ⚠ WARNING: You are using the default JWT_SECRET!');
    console.warn('  → Generate a secure secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
  }
}

validateEnv();

/* ─── Middleware ─── */

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS — allow frontend origin
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5500',  // Live Server default
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5500',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development, be lenient with localhost ports
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Rate limiting — general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Please slow down and try again later.' },
});
app.use('/api/', generalLimiter);

// Rate limiting — auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                    // 20 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts', message: 'Too many login/signup attempts. Please try again later.' },
});
app.use('/api/auth/', authLimiter);

/* ─── Request Logging ─── */

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`  ${color}${req.method} ${req.originalUrl} → ${status}\x1b[0m (${duration}ms)`);
  });
  next();
});

/* ─── Routes ─── */

app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/cal', calRoutes);

// Public config
app.get('/api/config', (req, res) => {
  res.json({
    status: 'ok',
    agency: 'ETERNITY',
    meetingUrl: process.env.MEETING_URL || 'https://cal.com/aryan-raj-eternity/quick-talk',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'eternity-api',
    timestamp: new Date().toISOString(),
  });
});

// 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

/* ─── Frontend Static Assets (Production / Standalone) ─── */
const frontendDir = path.join(__dirname, '..');
app.use(express.static(frontendDir, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// Fallback to index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

/* ─── Error Handler ─── */

app.use((err, req, res, next) => {
  console.error('  ✗ Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong. Please try again.',
  });
});

/* ─── Start Server ─── */

async function start() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   ETERNITY — API Server              ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Run database migrations on startup
  try {
    await runMigrations();
  } catch (err) {
    console.error('  ✗ Failed to run migrations. Server will not start.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n  🚀 ETERNITY API running at http://localhost:${PORT}`);
    console.log(`  📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`  🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log('\n  Ready for requests.\n');
  });
}

start();
