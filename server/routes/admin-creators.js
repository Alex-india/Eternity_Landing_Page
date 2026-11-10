const express = require('express');
const crypto = require('crypto');
const { query, getClient } = require('../db/connection');
const { NICHES } = require('../creator-config');
const { creatorFilters } = require('../creator-filters');
const { validateCreator } = require('../creator-validation');
const router = express.Router();
// Parent router enforces the single owner session and CSRF for all writes.
router.post('/', async (req, res, next) => {
  const { data, errors } = validateCreator(req.body, { manual: true });
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields.', errors });
  try {
    const result = await query(`INSERT INTO creators
      (id, full_name, instagram_handle, niche, follower_count, average_reel_views, country, rate_per_reel, whatsapp, email, source, consent_at, consent_version, entry_method, added_by, internal_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),'creator-sharing-dm-v1','manual',$12,$13)
      ON CONFLICT (instagram_handle) DO NOTHING RETURNING id`,
    [crypto.randomUUID(), data.fullName, data.instagramHandle, data.niche, data.followerCount, data.averageReelViews, data.country, data.ratePerReel, data.whatsapp, data.email, data.source, req.owner.id, data.internalNotes]);
    if (!result.rows.length) return res.status(409).json({ message: 'That Instagram handle is already in your creator list. Search for it to review the existing entry.', errors: { instagramHandle: 'This handle is already saved.' } });
    // This is an owner-entered record, not a new public signup. Do not email the creator or owner.
    res.status(201).json({ message: 'Creator added.', id: result.rows[0].id });
  } catch (err) { next(err); }
});
router.patch('/:id/details', async (req, res, next) => {
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(req.params.id)) return res.status(400).json({ message: 'Choose a valid creator.' });
  try {
    const current = (await query('SELECT entry_method FROM creators WHERE id=$1', [req.params.id])).rows[0];
    if (!current) return res.status(404).json({ message: 'Creator not found. Reload your creator list.' });
    const { data, errors } = validateCreator(req.body, { manual: current.entry_method === 'manual', admin: true, requireConsent: false });
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields.', errors });
    // Keep consent, entry method, original owner, review and email status unchanged.
    // A blank source stays Direct instead of being relabelled as a manual DM entry.
    const source = typeof req.body.source === 'string' ? req.body.source.trim() || null : null;
    const result = await query(`UPDATE creators SET full_name=$1, instagram_handle=$2, niche=$3, follower_count=$4,
      average_reel_views=$5, country=$6, rate_per_reel=$7, whatsapp=$8, email=$9, source=$10, internal_notes=$11, updated_at=NOW()
      WHERE id=$12 RETURNING id`,
    [data.fullName, data.instagramHandle, data.niche, data.followerCount, data.averageReelViews, data.country, data.ratePerReel, data.whatsapp, data.email, source, data.internalNotes, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Creator not found. Reload your creator list.' });
    res.json({ message: 'Creator details updated.', id: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That Instagram handle is already saved.', errors: { instagramHandle: 'This handle is already saved.' } });
    next(err);
  }
});
router.get('/', async (req, res, next) => {
  let filters;
  try { filters = creatorFilters(req.query); } catch (err) { return res.status(400).json({ message: err.message }); }
  const { params, where, order } = filters;
  const page = Math.min(100000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const limit = 25;
  try {
    const count = await query(`SELECT COUNT(*) AS count, (SELECT COUNT(*) FROM creators) AS total_entries FROM creators ${where}`, params);
    const rows = await query(`SELECT * FROM creators ${where} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, (page - 1) * limit]);
    res.json({ creators: rows.rows, page, total: Number(count.rows[0].count), totalEntries: Number(count.rows[0].total_entries), limit, niches: NICHES });
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
router.delete('/:id', async (req, res, next) => {
  const handle = req.body && req.body.instagramHandle;
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(req.params.id)
      || typeof handle !== 'string' || !handle || handle.length > 30) {
    return res.status(400).json({ message: 'A valid creator ID and matching Instagram handle are required.' });
  }
  let client;
  try {
    client = await getClient();
    await client.query('BEGIN');
    // Serialize with notification queueing so deletion cannot leave a queued profile snapshot.
    await client.query('SELECT pg_advisory_xact_lock(17430862)');
    const found = await client.query('SELECT instagram_handle FROM creators WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!found.rows.length || found.rows[0].instagram_handle !== handle) {
      await client.query('ROLLBACK');
      return res.status(found.rows.length ? 409 : 404).json({ message: found.rows.length ? 'The creator does not match. Reload the list before deleting.' : 'This creator has already been removed.' });
    }
    await client.query('DELETE FROM owner_notification_events WHERE event_key = $1', ['creator.joined:' + req.params.id.toLowerCase()]);
    await client.query('DELETE FROM creators WHERE id = $1', [req.params.id]);
    // Delivery metadata has no contact/profile fields; retain it for send-budget accounting.
    await client.query('COMMIT');
    res.json({ message: 'Creator permanently deleted.', id: req.params.id });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err.code === '23503') return res.status(409).json({ message: 'This creator is linked to other records and cannot be deleted.' });
    next(err);
  } finally { if (client) client.release(); }
});
module.exports = router;
