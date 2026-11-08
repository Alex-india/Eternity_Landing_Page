const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { query } = require('../db/connection');
const { sameOrigin } = require('../middleware/auth');
const { validateCreator } = require('../creator-validation');
const { CONSENT_VERSION, agencyName, whatsappNumber, whatsappLink } = require('../creator-config');
const { renderForm, renderThanks, validFormToken, escape } = require('../views/creators');
const { sendBrevoEmail } = require('../services/email');
const router = express.Router();
const receiptCookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/creators/thanks', maxAge: 15 * 60 * 1000 };
const submitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => wantsJSON(req) ? res.status(429).json({ message: 'Too many submissions. Please try again in an hour.' }) : res.status(429).send(renderForm(req.body, {}, 'Too many submissions. Please try again in an hour.')) });
function wantsJSON(req) { return req.is('application/json'); }
router.use('/creators', (req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" });
  next();
});
router.get('/creators', (req, res) => res.type('html').send(renderForm({ source: typeof req.query.src === 'string' ? req.query.src : '' })));
router.get('/creators/thanks', (req, res) => {
  let handle = '';
  try {
    const cookie = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith('creator_receipt='));
    const receipt = jwt.verify(cookie ? cookie.slice('creator_receipt='.length) : '', process.env.JWT_SECRET, { algorithms: ['HS256'], audience: 'creator-receipt' });
    handle = typeof receipt.handle === 'string' ? receipt.handle : '';
  } catch { /* Cookies may be disabled in an in-app browser; show a generic message. */ }
  res.type('html').send(renderThanks(handle));
});
async function submit(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  const fail = (status, message, errors = {}) => wantsJSON(req) ? res.status(status).json({ message, errors }) : res.status(status).type('html').send(renderForm(req.body, errors, message));
  if (!whatsappNumber()) return fail(503, 'Applications are temporarily paused. Please check back soon.');
  if (!validFormToken(req.body.formToken)) return fail(400, 'This form has expired. Please review your details and submit again.');
  if (req.body.companyWebsite) return fail(400, 'We could not accept this submission.');
  const { data, errors } = validateCreator(req.body);
  if (Object.keys(errors).length) return fail(400, 'Please check the highlighted fields.', errors);
  try {
    const emailEnabled = process.env.CREATOR_EMAIL_ENABLED === 'true' && Boolean(process.env.BREVO_API_KEY);
    const result = await query(`INSERT INTO creators
      (id, full_name, instagram_handle, niche, follower_count, average_reel_views, country, rate_per_reel, whatsapp, email, source, consent_at, consent_version, confirmation_email_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
      ON CONFLICT (instagram_handle) DO NOTHING RETURNING id`,
    [crypto.randomUUID(), data.fullName, data.instagramHandle, data.niche, data.followerCount, data.averageReelViews, data.country, data.ratePerReel, data.whatsapp, data.email, data.source || null, CONSENT_VERSION, emailEnabled ? 'pending' : 'disabled']);
    // Duplicate submissions neither overwrite profiles nor trigger repeat emails.
    if (result.rows.length && emailEnabled) {
      let sent = false;
      try {
        const delivery = await sendBrevoEmail({ to: { email: data.email, name: data.fullName }, subject: `Your creator application · ${agencyName()}`,
          htmlContent: `<p>Hi ${escape(data.fullName)},</p><p>We received your application to ${escape(agencyName())}. We review every profile manually.</p><p><a href="${escape(whatsappLink(data.instagramHandle))}">Confirm your profile on WhatsApp</a>. We may ask for recent insights there.</p>`,
          textContent: `Hi ${data.fullName}, we received your application to ${agencyName()}. Confirm on WhatsApp: ${whatsappLink(data.instagramHandle)}` });
        sent = delivery.success;
      } catch { /* The application is already stored even if email fails. */ }
      await query('UPDATE creators SET confirmation_email_status = $1 WHERE id = $2', [sent ? 'sent' : 'failed', result.rows[0].id]).catch(() => console.error('[creators] Could not record email status.'));
    }
    const receipt = jwt.sign({ handle: data.instagramHandle }, process.env.JWT_SECRET, { algorithm: 'HS256', audience: 'creator-receipt', expiresIn: '15m' });
    res.cookie('creator_receipt', receipt, receiptCookie);
    if (wantsJSON(req)) return res.status(200).json({ message: 'Submission received.', redirect: '/creators/thanks' });
    res.redirect(303, '/creators/thanks');
  } catch (err) {
    console.error('[creators] Submission failed:', err.code || 'database error');
    return fail(503, 'We could not save your application right now. Your details are still below; please try again shortly.');
  }
}
router.post(['/creators', '/api/creators'], submitLimiter, sameOrigin, submit);
module.exports = router;
