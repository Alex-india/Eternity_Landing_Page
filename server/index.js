/* ============================================================
   ETERNITY — Express API Server
   Main entry point. Loads middleware, mounts routes, runs
   database migrations on startup, and starts listening.
   ============================================================ */

const { validateEnv } = require('./config');

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

validateEnv();
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

/* ─── Middleware ─── */

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS — allow frontend origin
app.use(cors((req, callback) => {
  const origin = req.get('origin');
  const same = origin === `${req.protocol}://${req.get('host')}`;
  const local = process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  const allowed = !origin || same || local || origin === process.env.FRONTEND_URL;
  callback(null, { origin: allowed, credentials: true });
}));

// Parse JSON bodies
app.use(express.json({ limit: '64kb', verify: (req, res, buffer) => { if (req.path === '/api/cal/webhook') req.rawBody = buffer; } }));
app.use(express.urlencoded({ extended: false, limit: '16kb', parameterLimit: 30 }));
app.use('/api/admin', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

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
  const loggedPath = req.path.replace(/\/(s|reports|update)\/[^/]+/g, '/$1/[redacted]');
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`  ${color}${req.method} ${loggedPath} → ${status}\x1b[0m (${duration}ms)`);
  });
  next();
});

/* ─── Routes ─── */

app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/cal', calRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use(require('./routes/creators'));

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
// Only the dedicated public directory is browsable. Legacy assets are explicitly allowed.
app.use('/assets', express.static(path.join(frontendDir, 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    // HTML, CSS and JS revalidate on every load (cheap 304 via ETag), so a deploy
    // shows up immediately instead of after the 1-day cache expires
    if (/\.(html|css|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

for (const asset of ['style.css', 'script.js', 'lib/tubes1.js', 'favicon.svg', 'favicon.ico', 'favicon.png', 'apple-touch-icon.png']) {
  app.get('/' + asset, (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(frontendDir, asset)); });
}
app.get(['/', '/index.html', '/build'], (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));
app.use(require('./routes/admin-pages'));
app.use((req, res) => res.status(404).type('text').send('Page not found.'));

/* ─── Error Handler ─── */

app.use((err, req, res, next) => {
  console.error('  ✗ Unhandled error:', err.message);
  res.status(err.type === 'entity.too.large' ? 413 : err instanceof SyntaxError ? 400 : 500).json({
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

if (require.main === module) start();
module.exports = { app, start };
