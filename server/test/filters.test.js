const { test } = require('node:test');
const assert = require('node:assert/strict');
const { creatorFilters } = require('../creator-filters');
test('creator filters combine parameterized ranges, country and scoring with allowlisted sort', () => {
  const result = creatorFilters({ q: 'name_%', country: 'India', viewsMin: '5000', followersMax: '50000', rateMax: '2500.50', qualityMin: '70', scoreStatus: 'scored', sort: 'views' });
  assert.ok(result.where.includes('quality_score IS NOT NULL')); assert.ok(result.where.includes('average_reel_views >= $3')); assert.equal(result.order, 'average_reel_views DESC NULLS LAST, id');
  assert.deepEqual(result.params, ['%name\\_\\%%', 'india', '5000', '50000', '2500.50', '70']);
});
test('reject malformed ranges/dates/types and SQL injected sort', () => {
  for (const input of [{ rateMin: '-1' }, { viewsMin: '100', viewsMax: '50' }, { qualityMax: '101' }, { followersMin: '1e6' }, { joinedFrom: '2026-02-30' }, { joinedFrom: '2026-11-09', joinedTo: '2026-11-08' }, { sort: 'rate_per_reel; DROP TABLE creators' }, { country: [{}] }, { status: ['verified', 'forged'] }, { niche: ['Fashion', 'invalid'] }, { source: Array(21).fill('source') }, { entryMethod: 'injected' }]) assert.throws(() => creatorFilters(input));
});

test('multiple options use OR within each group and AND across groups and ranges', () => {
  const result = creatorFilters({ niche: ['Fashion', 'Lifestyle', 'Fashion'], status: ['verified', 'active'], country: 'India, Nepal', source: ['dm-a', 'dm-b'], viewsMin: '5000', rateMax: '3000', entryMethod: 'manual' });
  assert.ok(result.where.includes('status = ANY($1::text[]) AND niche = ANY($2::text[])'));
  assert.ok(result.where.includes('LOWER(country) = ANY($4::text[])'));
  assert.deepEqual(result.params, [['verified', 'active'], ['Fashion', 'Lifestyle'], ['dm-a', 'dm-b'], ['india', 'nepal'], 'manual', '5000', '3000']);
  const injection = creatorFilters({ source: ["x' OR 1=1 --", 'other'] });
  assert.ok(!injection.where.includes('OR 1=1')); assert.deepEqual(injection.params[0], ["x' OR 1=1 --", 'other']);
});
test('joined-through filter includes the full IST day using an exclusive next-midnight boundary', () => {
  const result = creatorFilters({ joinedFrom: '2026-11-08', joinedTo: '2026-11-08' });
  assert.deepEqual(result.params, ['2026-11-07T18:30:00.000Z', '2026-11-08T18:30:00.000Z']);
});
