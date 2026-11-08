const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { query } = require('../db/connection');
const { ownerEmail } = require('../config');
const { requireOwner, sameOrigin, generateToken, COOKIE, cookieOptions } = require('../middleware/auth');
const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' } });

router.post('/login', loginLimiter, sameOrigin, async (req, res, next) => {
  if (!req.is('application/json')) return res.status(415).json({ message: 'JSON is required.' });
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 1 || Buffer.byteLength(password) > 72 || email.length > 254) return res.status(400).json({ message: 'Enter your email and password.' });
  try {
    const result = await query("SELECT * FROM users WHERE LOWER(email) = $1 AND role = 'owner'", [email.trim().toLowerCase()]);
    const user = result.rows[0];
    // Compare even for an unknown account to avoid a fast account-existence signal.
    const hash = user ? user.password_hash : '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
    const valid = await bcrypt.compare(password, hash);
    if (!user || user.email.toLowerCase() !== ownerEmail() || !valid) return res.status(401).json({ message: 'Incorrect email or password.' });
    const token = generateToken(user, true);
    res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: 8 * 60 * 60 * 1000 });
    res.json({ csrfToken: jwt.decode(token).csrf });
  } catch (err) { next(err); }
});
router.use(requireOwner);
const testNotificationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false, message: { message: 'Test email limit reached. Try again in an hour.' } });
router.post('/notifications/test', testNotificationLimiter, sameOrigin, async (req, res, next) => {
  try {
    const result = await require('../services/notifications').sendTestNotification();
    const messages = { sent: 'Test email accepted by Brevo. Check your inbox and spam folder.', disabled: 'Set NOTIFICATIONS_ENABLED=true before testing.', misconfigured: 'Check OWNER_EMAIL, ADMIN_BASE_URL, BREVO_API_KEY and your configured Brevo sender.', failed: 'Brevo did not accept the test email. Check your sender/key settings and retry later.', 'daily-budget': 'Owner notification daily safety budget reached. Try later.' };
    res.status(result.status === 'sent' ? 200 : 409).json({ status: result.status, message: messages[result.status] || 'Test email is not available right now.' });
  } catch (err) { next(err); }
});
router.use('/creators', require('./admin-creators'));
router.get('/session', (req, res) => res.json({ email: req.owner.email, csrfToken: req.user.csrf }));
router.post('/logout', sameOrigin, async (req, res, next) => {
  try {
    await query('UPDATE users SET session_version = session_version + 1 WHERE id = $1', [req.owner.id]);
    res.clearCookie(COOKIE, cookieOptions());
    res.json({ message: 'Signed out.' });
  } catch (err) { next(err); }
});
module.exports = router;
