const crypto = require('crypto');
const { pool, query } = require('../db/connection');
const { sendBrevoEmail } = require('./email');
const { notificationConfig } = require('./notification-config');
const { creatorSnapshot, joinedMail, digestMail, mail, digestWindow, compact } = require('./notification-format');
const LOCK = 17430862;
const DAILY_ATTEMPT_LIMIT = 200; // Conservative rolling 24h cap; leaves room for existing site mail.
const warning = (reason) => console.warn('[notifications] ' + reason + '; creator signup is unaffected.');

async function locked(work) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK]); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function deliver(key, content) {
  const config = notificationConfig();
  if (!config.ready) return { status: config.enabled ? 'misconfigured' : 'disabled' };
  const claim = await locked(async (client) => {
    await client.query('INSERT INTO owner_notification_deliveries (delivery_key) VALUES ($1) ON CONFLICT DO NOTHING', [key]);
    const row = (await client.query('SELECT *, NOW() AS db_now FROM owner_notification_deliveries WHERE delivery_key = $1 FOR UPDATE', [key])).rows[0];
    if (row.status === 'sent') return 'already-sent';
    if (row.attempts >= 3) return 'exhausted';
    if ((row.lease_until && row.lease_until > row.db_now) || (row.last_attempt_at && row.db_now - row.last_attempt_at < 5 * 60000)) return 'busy';
    const count = (await client.query("SELECT COALESCE(SUM(attempts), 0) AS count FROM owner_notification_deliveries WHERE last_attempt_at > NOW() - INTERVAL '24 hours'")).rows[0].count;
    if (Number(count) >= DAILY_ATTEMPT_LIMIT) return 'daily-budget';
    await client.query("UPDATE owner_notification_deliveries SET status = 'sending', attempts = attempts + 1, last_attempt_at = NOW(), lease_until = NOW() + INTERVAL '1 minute' WHERE delivery_key = $1", [key]);
    return 'claimed';
  });
  if (claim !== 'claimed') return { status: claim };
  let accepted = false;
  try {
    const result = await sendBrevoEmail({ to: config.owner, ...content, timeoutMs: 3500, quiet: true });
    accepted = Boolean(result.success);
  } catch { /* Never log exception text, headers, or credentials. */ }
  await query(`UPDATE owner_notification_deliveries SET status = $1, sent_at = ${accepted ? 'NOW()' : 'NULL'}, lease_until = NULL WHERE delivery_key = $2`, [accepted ? 'sent' : 'failed', key]);
  if (!accepted) warning('Brevo send failed or timed out; scheduled retries will try again');
  return { status: accepted ? 'sent' : 'failed' };
}

const CREATOR_COLUMNS = 'id, instagram_handle, niche, follower_count, average_reel_views, country, rate_per_reel, source, created_at';
// Add a loader, renderer and summary line here for another event; delivery/limits stay shared.
const EVENT_HANDLERS = {
  'creator.joined': {
    async load(event) {
      if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(event.creatorId || '')) return null;
      const row = (await query(`SELECT ${CREATOR_COLUMNS} FROM creators WHERE id = $1`, [event.creatorId])).rows[0];
      return row ? { id: row.id, payload: creatorSnapshot(row), occurredAt: row.created_at } : null;
    },
    render: joinedMail,
    summaryLine: (creator) => `@${creator.handle} | ${creator.niche} | ${compact(creator.followers)} followers | ${compact(creator.views)} average views`,
  },
};
async function notifyOwner(event) {
  try {
    const config = notificationConfig();
    if (!config.ready) { if (config.enabled) warning('Owner email configuration is incomplete'); return { status: config.enabled ? 'misconfigured' : 'disabled' }; }
    if (!event || !Object.hasOwn(EVENT_HANDLERS, event.type)) return { status: 'unsupported-event' };
    const handler = EVENT_HANDLERS[event.type];
    const record = await handler.load(event);
    if (!record) return { status: 'missing-record' };
    const key = event.type + ':' + record.id;
    const mode = await locked(async (client) => {
      if ((await client.query('SELECT event_key FROM owner_notification_events WHERE event_key = $1', [key])).rows.length) return 'duplicate';
      const hour = (await client.query("SELECT date_trunc('hour', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS hour")).rows[0].hour;
      const count = Number((await client.query("SELECT COUNT(*) FROM owner_notification_events WHERE hour_start = $1 AND mode = 'individual'", [hour])).rows[0].count);
      const selected = count < config.hourlyLimit ? 'individual' : 'summary';
      await client.query('INSERT INTO owner_notification_events (event_key, event_type, payload, occurred_at, hour_start, mode) VALUES ($1,$2,$3,$4,$5,$6)', [key, event.type, JSON.stringify(record.payload), record.occurredAt, hour, selected]);
      return selected;
    });
    if (mode !== 'individual') return { status: mode === 'summary' ? 'queued-for-summary' : 'duplicate' };
    return await deliver(key, handler.render(record.payload, config.adminURL));
  } catch { warning('Could not queue or deliver owner email'); return { status: 'failed' }; }
}

async function sendTestNotification() {
  const config = notificationConfig();
  if (!config.ready) return { status: config.enabled ? 'misconfigured' : 'disabled' };
  return deliver('test:' + crypto.randomUUID(), mail('Eternity: owner notification test', ['Owner notifications are connected.', 'This test uses your existing Brevo sender. No creator contact information is included.'], config.adminURL));
}

async function runScheduledNotifications(now = new Date(), { maxIndividuals = 25, maxHours = 24 } = {}) {
  const config = notificationConfig();
  if (!config.ready) return { status: config.enabled ? 'misconfigured' : 'disabled', results: [] };
  const results = [];
  const pending = await query(`SELECT e.* FROM owner_notification_events e LEFT JOIN owner_notification_deliveries d ON d.delivery_key = e.event_key
    WHERE e.mode = 'individual' AND (d.delivery_key IS NULL OR (d.status <> 'sent' AND d.attempts < 3 AND (d.last_attempt_at IS NULL OR d.last_attempt_at < NOW() - INTERVAL '5 minutes')))
    ORDER BY e.queued_at LIMIT $1`, [maxIndividuals]);
  for (const event of pending.rows) results.push(await deliver(event.event_key, EVENT_HANDLERS[event.event_type].render(event.payload, config.adminURL)));
  const hours = await query(`SELECT DISTINCT e.hour_start FROM owner_notification_events e
    LEFT JOIN owner_notification_deliveries d ON d.delivery_key = 'hour:' || to_char(e.hour_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS".000Z"')
    WHERE e.mode = 'summary' AND e.hour_start + INTERVAL '1 hour' <= $1 AND (d.delivery_key IS NULL OR (d.status <> 'sent' AND d.attempts < 3 AND (d.last_attempt_at IS NULL OR d.last_attempt_at < NOW() - INTERVAL '5 minutes'))) ORDER BY e.hour_start LIMIT $2`, [now, maxHours]);
  for (const { hour_start: hour } of hours.rows) {
    const items = await query("SELECT event_type, payload FROM owner_notification_events WHERE hour_start = $1 AND mode = 'summary' ORDER BY queued_at LIMIT 500", [hour]);
    const counts = await query("SELECT payload->>'source' AS source, COUNT(*) AS count FROM owner_notification_events WHERE hour_start = $1 AND mode = 'summary' GROUP BY payload->>'source' ORDER BY source", [hour]);
    const total = counts.rows.reduce((sum, row) => sum + Number(row.count), 0);
    const sources = counts.rows.map((row) => [row.source, Number(row.count)]);
    const lines = [`Overflow summary for ${hour.toISOString()} (UTC).`, `${total} new events held for this summary.`, ...items.rows.map((row) => EVENT_HANDLERS[row.event_type].summaryLine(row.payload))];
    if (total > items.rows.length) lines.push(`${total - items.rows.length} more records are available in admin.`);
    lines.push('', 'By source:', ...sources.map(([source, count]) => `${source || 'Direct'}: ${count}`));
    results.push(await deliver('hour:' + hour.toISOString(), mail(`Creator network: ${total} more creators this hour`, lines, config.adminURL)));
  }
  const window = digestWindow(now);
  const counts = await query('SELECT COALESCE(source, \'Direct\') AS source, COUNT(*) AS count FROM creators WHERE created_at >= $1 AND created_at < $2 GROUP BY COALESCE(source, \'Direct\') ORDER BY source', [window.start, window.end]);
  const total = counts.rows.reduce((sum, row) => sum + Number(row.count), 0);
  if (total) {
    const rows = await query(`SELECT ${CREATOR_COLUMNS} FROM creators WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at LIMIT 500`, [window.start, window.end]);
    results.push(await deliver('digest:' + window.key, digestMail(`Creator network: ${total} new creators · daily digest`, rows.rows.map(creatorSnapshot), total, counts.rows.map((row) => [row.source, Number(row.count)]), config.adminURL, `24 hours ending ${window.end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST.`)));
  }
  return { status: 'processed', results };
}
module.exports = { notifyOwner, sendTestNotification, runScheduledNotifications, DAILY_ATTEMPT_LIMIT };
