const { test } = require('node:test');
const assert = require('node:assert/strict');
const { creatorExport } = require('../creator-export');

test('WhatsApp export uses a public field allowlist, full metrics and honest pending status', () => {
  const text = creatorExport([{ full_name: 'A Creator', instagram_handle: 'a.creator', niche: 'Fashion', country: 'India', follower_count: '49000', average_reel_views: '12000', rate_per_reel: '2500.50', status: 'pending',
    email: 'private@example.test', whatsapp: '919999999999', source: 'secret-source', internal_notes: 'PRIVATE NOTE', quality_score: 88, consent_version: 'PRIVATE CONSENT' }]);
  for (const value of ['A Creator', 'https://www.instagram.com/a.creator/', '49,000', '12,000', '2,500.5', 'Pending review']) assert.ok(text.includes(value), value);
  for (const value of ['private@example.test', '919999999999', 'secret-source', 'PRIVATE NOTE', 'PRIVATE CONSENT', '88']) assert.ok(!text.includes(value), value);
});

test('export keeps unknown values distinct from zero and removes injected formatting/links', () => {
  const text = creatorExport([{ full_name: '*Fake*\nhttps://evil.example/ ~Title~', instagram_handle: 'safe.creator', niche: 'Other', country: 'India', follower_count: null, average_reel_views: 0, rate_per_reel: null, status: 'verified' }]);
  assert.ok(!text.includes('https://evil.example')); assert.ok(!text.includes('*Fake*')); assert.ok(text.includes('Followers: Not provided'));
  assert.ok(text.includes('Average reel views: 0')); assert.ok(text.includes('Profile status: Verified'));
  assert.equal((text.match(/https:\/\//g) || []).length, 1);
});
