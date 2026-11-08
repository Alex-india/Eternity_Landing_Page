const express = require('express');
const { requireOwner } = require('../middleware/auth');
const { renderLogin, renderCreators } = require('../views/admin');
const router = express.Router();
router.use('/admin', (req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" });
  next();
});
router.get('/admin/login', (req, res) => res.type('html').send(renderLogin()));
router.get('/admin', (req, res) => res.redirect('/admin/creators'));
router.get('/admin/creators', requireOwner, (req, res) => res.type('html').send(renderCreators()));
module.exports = router;
