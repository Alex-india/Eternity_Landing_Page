const express = require('express');
const { query } = require('../db/connection');
const { NICHES } = require('../creator-config');
const { creatorFilters } = require('../creator-filters');
const router = express.Router();
router.get('/', async (req, res, next) => {
  let filters;
  try { filters = creatorFilters(req.query); } catch (err) { return res.status(400).json({ message: err.message }); }
  const { params, where, order } = filters;
  const page = Math.min(100000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const limit = 25;
  try {
    const count = await query(`SELECT COUNT(*) FROM creators ${where}`, params);
    const rows = await query(`SELECT * FROM creators ${where} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, (page - 1) * limit]);
    res.json({ creators: rows.rows, page, total: Number(count.rows[0].count), limit, niches: NICHES });
  } catch (err) { next(err); }
});
router.patch('/:id', async (req, res, next) => {
  const { status, qualityScore, internalNotes } = req.body;
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(req.params.id)
      || !['pending', 'verified', 'active'].includes(status)
      || !(qualityScore === null || (Number.isInteger(qualityScore) && qualityScore >= 0 && qualityScore <= 100))
      || typeof internalNotes !== 'string' || internalNotes.length > 5000) return res.status(400).json({ message: 'Check status, score (0–100), and notes (up to 5000 characters).' });
  try {
    // Atomic guard: a pending creator must pass verification before becoming active.
    const result = await query(`UPDATE creators SET status = $1, quality_score = $2, internal_notes = $3,
      verified_at = CASE WHEN $1 = 'pending' THEN NULL ELSE COALESCE(verified_at, NOW()) END, updated_at = NOW()
      WHERE id = $4 AND NOT (status = 'pending' AND $1 = 'active') RETURNING id`, [status, qualityScore, internalNotes.trim(), req.params.id]);
    if (!result.rows.length) return res.status(409).json({ message: 'Verify the creator before activating them, or reload if the record has changed.' });
    res.json({ message: 'Creator updated.' });
  } catch (err) { next(err); }
});
module.exports = router;
