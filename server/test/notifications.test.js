const { test } = require('node:test');
const assert = require('node:assert/strict');
const { creatorSnapshot, joinedMail, digestWindow } = require('../services/notification-format');
const { notificationConfig, warnNotificationConfig } = require('../services/notification-config');
test('owner email contains the required fields, compact subject, safe HTML, and no contact data', () => {
  const snapshot = creatorSnapshot({ instagram_handle: 'example.creator\r\nBcc:test', niche: 'Tech <img src=x>\r\nInjected', follower_count: '12500', average_reel_views: '5000', country: 'India', rate_per_reel: '2500.50', source: 'dm-<a href="https://evil.example">click</a>', created_at: '2026-11-08T12:00:00Z', whatsapp: '919999999999', email: 'private@example.test', internal_notes: 'private notes' });
  const result = joinedMail(snapshot, 'https://agency.example/admin/creators');
  assert.ok(result.subject.includes('12.5K followers')); assert.ok(!/[\r\n]/.test(result.subject));
  assert.ok(result.htmlContent.includes('&lt;img')); assert.ok(!result.htmlContent.includes('<img')); assert.ok(!result.htmlContent.includes('https://evil.example'));
  assert.equal((result.htmlContent.match(/<a /g) || []).length, 1);
  const content = result.htmlContent + result.textContent; assert.ok(content.includes('Average reel views')); assert.ok(content.includes('INR 2,500.5')); assert.ok(content.includes('IST'));
  for (const privateValue of ['919999999999', 'private@example.test', 'private notes']) assert.ok(!content.includes(privateValue));
  assert.equal(snapshot.email, undefined); assert.equal(snapshot.whatsapp, undefined);
});
test('daily digest uses an 8pm IST boundary, including just before/after and year rollover', () => {
  assert.equal(digestWindow(new Date('2026-11-08T14:29:59Z')).end.toISOString(), '2026-11-07T14:30:00.000Z');
  const window = digestWindow(new Date('2026-11-08T14:30:00Z')); assert.equal(window.end.toISOString(), '2026-11-08T14:30:00.000Z'); assert.equal(window.end - window.start, 86400000);
  assert.equal(digestWindow(new Date('2027-01-01T01:00:00Z')).key, '2026-12-31');
});
test('enabled notification config rejects placeholders and logs only missing setting names', () => {
  const previous = { ...process.env }, warn = console.warn, messages = [];
  Object.assign(process.env, { NODE_ENV: 'production', NOTIFICATIONS_ENABLED: 'true', OWNER_EMAIL: 'owner@example.test', BREVO_API_KEY: 'test-secret-key-never-log', BREVO_SENDER_EMAIL: 'verified@example.test', ADMIN_BASE_URL: 'https://agency.example', NOTIFY_HOURLY_LIMIT: '20' });
  console.warn = (text) => messages.push(text);
  try {
    assert.equal(notificationConfig().ready, true); assert.equal(notificationConfig().adminURL, 'https://agency.example/admin/creators');
    process.env.ADMIN_BASE_URL = 'https://replace-with-your-site.example'; assert.equal(notificationConfig().ready, false); warnNotificationConfig();
    delete process.env.OWNER_EMAIL; delete process.env.BREVO_API_KEY; warnNotificationConfig();
    assert.ok(messages.join(' ').includes('OWNER_EMAIL')); assert.ok(messages.join(' ').includes('BREVO_API_KEY')); assert.ok(!messages.join(' ').includes('test-secret-key-never-log'));
    process.env.NOTIFY_HOURLY_LIMIT = '0'; assert.ok(notificationConfig().missing.some((value) => value.startsWith('NOTIFY_HOURLY_LIMIT')));
  } finally { console.warn = warn; for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env, previous); }
});
