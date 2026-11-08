const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');
const { ownerEmail } = require('../config');
const COOKIE = 'eternity_admin';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
function reject(req, res, status, message) {
  if (/^\/admin(?:\/|$)/.test(req.originalUrl)) return res.redirect(303, '/admin/login');
  return res.status(status).json({ message });
}
function cookieToken(req) {
  const part = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  return part ? part.slice(COOKIE.length + 1) : null;
}
function extractToken(req) {
  const bearer = req.get('authorization');
  req.authViaCookie = !bearer;
  if (bearer) return bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
  return cookieToken(req);
}
function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return reject(req, res, 401, 'Please log in.');
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isInteger(decoded.id)) throw new Error('Invalid user');
    if (req.authViaCookie && decoded.purpose !== 'admin') throw new Error('Invalid session');
    req.user = decoded;
    next();
  } catch { reject(req, res, 401, 'Session expired or invalid. Please log in again.'); }
}
// Read current authorization from PostgreSQL; never trust a role in a token.
function requireOwner(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  requireAuth(req, res, async () => {
    try {
      const result = await query('SELECT id, email, role, session_version FROM users WHERE id = $1', [req.user.id]);
      const user = result.rows[0];
      if (!user || user.role !== 'owner' || !ownerEmail() || user.email.toLowerCase() !== ownerEmail() || user.session_version !== req.user.sessionVersion || req.user.purpose !== 'admin') return reject(req, res, 403, 'Owner access required.');
      if (req.authViaCookie && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const csrf = req.get('x-csrf-token') || '';
        if (!csrf || csrf !== req.user.csrf) return res.status(403).json({ message: 'Invalid security token. Reload and try again.' });
      }
      req.owner = user;
      next();
    } catch (err) { next(err); }
  });
}
function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  if ((origin && origin !== `${req.protocol}://${req.get('host')}`) || req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ message: 'Use this form on the original website.' });
  next();
}
function generateToken(user, admin = false) {
  return jwt.sign({ id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
    sessionVersion: user.session_version, purpose: admin ? 'admin' : 'site', ...(admin ? { csrf: crypto.randomBytes(32).toString('hex') } : {}),
  }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: admin ? '8h' : '1d' });
}
module.exports = { requireAuth, requireOwner, sameOrigin, generateToken, COOKIE, cookieOptions };
