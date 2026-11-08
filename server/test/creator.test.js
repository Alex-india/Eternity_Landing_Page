const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET ||= 'unit-test-secret-abcdefghijklmnopqrstuvwxyz';
const { normalizeHandle, validateCreator } = require('../creator-validation');
const { formToken, validFormToken, renderForm, renderThanks } = require('../views/creators');
const { whatsappLink } = require('../creator-config');
const { validateEnv } = require('../config');
const valid = { fullName: 'A Creator', instagramHandle: '@Example.Creator', niche: 'Technology', followerCount: '12000', averageReelViews: '8500', country: 'India', ratePerReel: '2500.50', whatsapp: '+91 99999 99999', email: 'CREATOR@example.com', consent: 'on', source: 'dm-batch1' };
test('normalize handles and Instagram profile URLs to a single duplicate key', () => {
  for (const value of ['@Example.Creator', ' example.creator ', 'https://www.instagram.com/Example.Creator/?igsh=123']) assert.equal(normalizeHandle(value), 'example.creator');
  assert.ok(validateCreator({ ...valid, instagramHandle: 'https://evil.example/foo' }).errors.instagramHandle);
});
test('validate and normalize submission; reject bad types, missing consent, forged niche and numeric overflow', () => {
  const { data, errors } = validateCreator(valid);
  assert.deepEqual(errors, {}); assert.equal(data.whatsapp, '919999999999'); assert.equal(data.email, 'creator@example.com'); assert.equal(data.source, 'dm-batch1');
  for (const [key, value] of Object.entries({ fullName: [], instagramHandle: 'invalid..handle', niche: 'Trading signals', followerCount: '2e6', averageReelViews: '2000000001', country: '<script>', ratePerReel: '-12', whatsapp: 'abcdef12345678', email: {}, consent: false })) assert.ok(validateCreator({ ...valid, [key]: value }).errors[key], key);
  assert.equal(validateCreator({ ...valid, source: '<script>' }).data.source, '');
});
test('signed public form token rejects forgery and expiration', () => {
  const token = formToken(); assert.ok(validFormToken(token)); assert.equal(validFormToken(token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')), false); assert.equal(validFormToken([]), false);
  const now = Date.now; Date.now = () => now() + 25 * 60 * 60 * 1000;
  try { assert.equal(validFormToken(token), false); } finally { Date.now = now; }
});
test('standalone creator HTML escapes redisplayed fields and has no site layout or third-party dependencies', () => {
  const html = renderForm({ fullName: '"><script>alert(1)</script>', source: 'dm-batch1' });
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<nav')); assert.ok(!html.includes('<footer')); assert.ok(!html.includes('cdn.tailwindcss')); assert.ok(html.includes('noindex')); assert.ok(html.includes('action="/creators"'));
});
test('WhatsApp confirmation uses only the configured number and URL-encoded handle', () => {
  const previous = process.env.CREATOR_WHATSAPP_NUMBER; process.env.CREATOR_WHATSAPP_NUMBER = '919999999999';
  try { const link = new URL(whatsappLink('example.creator')); assert.equal(link.pathname, '/919999999999'); assert.ok(link.searchParams.get('text').includes('as @example.creator')); assert.ok(renderThanks('example.creator').includes('Confirm on WhatsApp')); }
  finally { if (previous === undefined) delete process.env.CREATOR_WHATSAPP_NUMBER; else process.env.CREATOR_WHATSAPP_NUMBER = previous; }
});
test('production refuses missing/placeholder owner and WhatsApp config', () => {
  const previous = { ...process.env }; Object.assign(process.env, { NODE_ENV: 'production', DATABASE_URL: 'postgres://test', JWT_SECRET: 'x'.repeat(40), OWNER_EMAIL: 'owner@example.com', CREATOR_WHATSAPP_NUMBER: '919999999999' });
  try {
    assert.doesNotThrow(validateEnv); delete process.env.CREATOR_WHATSAPP_NUMBER; assert.throws(validateEnv, /CREATOR_WHATSAPP_NUMBER/);
    process.env.CREATOR_WHATSAPP_NUMBER = '919999999999'; process.env.OWNER_EMAIL = 'REPLACE_ME'; assert.throws(validateEnv, /OWNER_EMAIL/);
  } finally { for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env, previous); }
});
