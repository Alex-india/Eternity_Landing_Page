const { test } = require('node:test');
const assert = require('node:assert/strict');
const { creatorOriginAllowed } = require('../creator-origin');
const request = (origin, host = 'localhost:3000', protocol = 'http') => ({ protocol, get: (key) => key === 'origin' ? origin : key === 'host' ? host : undefined });
test('public creator intake accepts native no-referrer and in-app browser origins', () => {
  assert.equal(creatorOriginAllowed(request('null')), true);
  assert.equal(creatorOriginAllowed(request(undefined)), true);
  assert.equal(creatorOriginAllowed(request('http://localhost:3000')), true);
});
test('public creator intake recognizes configured public origins behind a proxy and rejects other sites', () => {
  const previous = process.env.ADMIN_BASE_URL;
  process.env.ADMIN_BASE_URL = 'https://creators.example.test';
  try {
    assert.equal(creatorOriginAllowed(request('https://creators.example.test', 'internal-service:3000')), true);
    assert.equal(creatorOriginAllowed(request('https://evil.example.test', 'internal-service:3000')), false);
    assert.equal(creatorOriginAllowed(request('https://creators.example.test.evil.test')), false);
  } finally { if (previous === undefined) delete process.env.ADMIN_BASE_URL; else process.env.ADMIN_BASE_URL = previous; }
});
