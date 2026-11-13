const { test } = require('node:test');
const assert = require('node:assert/strict');
const { creatorExport, creatorLabel } = require('../creator-export');

test('first-look export matches the requested anonymous format and discloses the 10% brand fee', () => {
  const text = creatorExport([{ full_name: 'SECRET NAME', instagram_handle: 'secret.handle', niche: 'Fashion', country: 'India', follower_count: '66500', average_reel_views: '100000', rate_per_reel: '30000', status: 'verified',
    email: 'private@example.test', whatsapp: '919999999999', source: 'secret-source', internal_notes: 'PRIVATE NOTE', quality_score: 88, consent_version: 'PRIVATE CONSENT' },
  { full_name: 'SECOND SECRET', instagram_handle: 'second.secret', niche: 'Fashion', country: 'India', follower_count: 25800, average_reel_views: 500000, rate_per_reel: 12000, status: 'active' }], { brandName: 'Acme', campaignNiche: 'Fashion' });
  assert.equal(text, '*ETERNITY | Creator shortlist*\nAcme | Fashion | 2 creators\n\n*Creator A*\nNiche: Fashion\nCountry: India\nFollowers: ~66.5K\nAverage reel views: ~100K\nRate per reel: ₹30,000 + 10% Eternity fee\nProfile: Verified by Eternity\n\n*Creator B*\nNiche: Fashion\nCountry: India\nFollowers: ~25.8K\nAverage reel views: ~500K\nRate per reel: ₹12,000 + 10% Eternity fee\nProfile: Verified by Eternity\n\nRates are indicative. Profiles are shared after you confirm the terms. Final price, availability and deliverables are confirmed by Eternity.');
  for (const value of ['SECRET NAME', 'secret.handle', 'SECOND SECRET', 'second.secret', 'private@example.test', '919999999999', 'secret-source', 'PRIVATE NOTE', 'PRIVATE CONSENT', 'https://', '88']) assert.ok(!text.includes(value), value);
});

test('unknown metrics, zero rates and pending profiles remain honest; formatting and links cannot alter the message', () => {
  const text = creatorExport([{ full_name: '*Secret*', instagram_handle: 'secret.creator', niche: 'Other', country: 'India', follower_count: null, average_reel_views: 0, rate_per_reel: null, status: 'pending' },
    { niche: 'Fashion', country: 'India', follower_count: 999, average_reel_views: 1250000, rate_per_reel: 0, status: 'pending' }], { brandName: '*Brand*\nhttps://evil.example/ ~Title~ | injected' });
  assert.ok(!text.includes('https://evil.example')); assert.ok(!text.includes('*Brand*')); assert.ok(text.includes('Followers: Not provided'));
  assert.ok(text.includes('Average reel views: 0')); assert.ok(text.includes('Average reel views: ~1.3M'));
  assert.ok(text.includes('Rate per reel: To be confirmed + 10% Eternity fee')); assert.ok(text.includes('Rate per reel: ₹0 + 10% Eternity fee'));
  assert.ok(text.includes('Profile: Pending verification by Eternity')); assert.ok(!text.includes('Profile: Verified by Eternity'));
  assert.ok(text.includes('Mixed niches')); assert.ok(!text.includes('secret.creator'));
});

test('anonymous creator labels continue uniquely beyond Z', () => {
  assert.equal(creatorLabel(0), 'Creator A'); assert.equal(creatorLabel(25), 'Creator Z');
  assert.equal(creatorLabel(26), 'Creator AA'); assert.equal(creatorLabel(199), 'Creator GR');
});
