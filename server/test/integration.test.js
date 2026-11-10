const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const databaseURL = process.env.TEST_DATABASE_URL;
test('owner security and creator onboarding against isolated PostgreSQL', { skip: !databaseURL }, async (t) => {
  const database = new URL(databaseURL);
  assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname) && database.pathname === '/eternity_creator_test', 'Tests require a dedicated localhost database named eternity_creator_test.');
  Object.assign(process.env, { DATABASE_URL: databaseURL, DATABASE_SSL: 'false', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(40).toString('hex'), OWNER_EMAIL: 'owner@example.test', CREATOR_WHATSAPP_NUMBER: '919999999999', CREATOR_EMAIL_ENABLED: 'false', NOTIFICATIONS_ENABLED: 'false', CAL_WEBHOOK_SECRET: 'test-webhook-secret', ALLOW_DEV_SIGNUP: 'false' });
  const { query, pool } = require('../db/connection');
  const { runMigrations } = require('../db/migrate');
  const { setupOwner } = require('../db/setup-owner');
  const { generateToken } = require('../middleware/auth');
  const { app } = require('../index');
  const suffix = Date.now().toString(36);
  let server;
  t.after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); await pool.end(); });
  // Install the existing schema to simulate an upgrade of the current site.
  await query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
  const historyExists = (await query("SELECT to_regclass('public.schema_migrations') AS name")).rows[0].name;
  const ownerMigrationApplied = historyExists && (await query("SELECT name FROM schema_migrations WHERE name = '001_owner.sql'")).rows.length;
  if (!ownerMigrationApplied) await query("INSERT INTO users (first_name,last_name,email,password_hash) VALUES ('Demo','Test','demo@eternity.dev','test-hash') ON CONFLICT (email) DO NOTHING");
  // Run the real migration runner, including demo removal. The test DB is dedicated.
  await runMigrations();
  assert.equal((await query("SELECT id FROM users WHERE email = 'demo@eternity.dev'")).rows.length, 0);
  process.env.OWNER_PASSWORD = 'Owner-test-' + crypto.randomBytes(16).toString('hex');
  const password = process.env.OWNER_PASSWORD;
  await setupOwner(); delete process.env.OWNER_PASSWORD;
  const owner = (await query("SELECT * FROM users WHERE role = 'owner'")).rows[0];
  const member = (await query("INSERT INTO users (first_name,last_name,email,password_hash) VALUES ('Member','Test',$1,'test-hash') RETURNING *", [`member-${suffix}@example.test`])).rows[0];
  const memberToken = generateToken(member);
  server = await new Promise((resolve) => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const originalFetch = global.fetch;
  const request = (url, options = {}) => originalFetch(base + url, { redirect: 'manual', ...options });
  const json = (body, extra = {}) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...extra }, body: JSON.stringify(body) });
  let cookie, csrf, creatorID;
  const handle = 'creator_' + suffix;
  async function token() { const html = await (await request('/creators?src=dm-batch1')).text(); return /name="formToken" value="([^"]+)"/.exec(html)[1]; }
  const fields = async (overrides = {}) => ({ fullName: 'Test Creator', instagramHandle: '@' + handle, niche: 'Technology', followerCount: '12000', averageReelViews: '8500', country: 'India', ratePerReel: '2500.50', whatsapp: '+91 99999 99999', email: `creator-${suffix}@example.test`, source: 'dm-batch1', consent: 'on', formToken: await token(), ...overrides });

  await t.test('migrations are repeatable, no demo account remains, only one owner is possible', async () => {
    await runMigrations();
    assert.equal((await query("SELECT id FROM users WHERE email = 'demo@eternity.dev'")).rows.length, 0);
    await assert.rejects(query("UPDATE users SET role = 'owner' WHERE id = $1", [member.id]), { code: '23505' });
  });
  await t.test('production signup is closed even when development signup flag is true', async () => {
    process.env.NODE_ENV = 'production'; process.env.ALLOW_DEV_SIGNUP = 'true';
    try { assert.equal((await request('/api/auth/signup', json({}))).status, 403); }
    finally { process.env.NODE_ENV = 'test'; process.env.ALLOW_DEV_SIGNUP = 'false'; }
  });
  await t.test('every private endpoint denies anonymous users and signed-in members', async () => {
    for (const url of ['/api/inquiries', '/api/cal/bookings', '/api/cal/email-status', '/api/auth/me', '/api/admin/creators', '/api/admin/session']) {
      assert.equal((await request(url)).status, 401, url);
      assert.equal((await request(url, { headers: { Authorization: 'Bearer ' + memberToken } })).status, 403, url);
    }
    assert.equal((await request('/api/cal/send-confirmation', json({}))).status, 401);
    assert.equal((await request('/admin/creators')).headers.get('location'), '/admin/login');
  });
  await t.test('repo files stay private and existing page/assets still load', async () => {
    for (const url of ['/server/index.js', '/server/.env', '/server/db/schema.sql', '/package.json', '/.git/config', '/neon.ts', '/unknown-page']) assert.equal((await request(url)).status, 404, url);
    for (const url of ['/', '/build', '/style.css?v=3', '/script.js?v=3', '/lib/tubes1.js?v=3', '/favicon.svg', '/assets/network.css']) assert.equal((await request(url)).status, 200, url);
    const html = await (await request('/creators')).text(); assert.ok(!html.includes('<nav')); assert.ok(!html.includes('script.js?v=3'));
  });
  await t.test('owner login uses HttpOnly cookie, never returns an access token; old owner tokens are denied', async () => {
    assert.equal((await request('/api/admin/login', json({ email: process.env.OWNER_EMAIL, password: 'wrong' }))).status, 401);
    assert.equal((await request('/api/admin/login', json({ email: process.env.OWNER_EMAIL, password }, { Origin: 'https://evil.example' }))).status, 403);
    const login = await request('/api/admin/login', json({ email: process.env.OWNER_EMAIL, password }));
    assert.equal(login.status, 200); assert.match(login.headers.get('set-cookie'), /HttpOnly/); assert.match(login.headers.get('set-cookie'), /SameSite=Strict/);
    cookie = login.headers.get('set-cookie').split(';')[0]; const data = await login.json(); csrf = data.csrfToken; assert.ok(csrf); assert.equal(data.token, undefined);
    assert.equal((await request('/admin/creators', { headers: { Cookie: cookie } })).status, 200);
    const legacy = jwt.sign({ id: owner.id, email: owner.email }, process.env.JWT_SECRET);
    assert.equal((await request('/api/inquiries', { headers: { Authorization: 'Bearer ' + legacy } })).status, 403);
  });
  await t.test('invalid forms preserve values; consent, honeypot and signed token are enforced', async () => {
    const invalid = await fields({ consent: '' });
    const result = await request('/creators', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(invalid) });
    assert.equal(result.status, 400); const html = await result.text(); assert.ok(html.includes('Test Creator')); assert.ok(html.includes('consent-error'));
    assert.equal((await request('/creators', json(await fields({ companyWebsite: 'bot.example' })))).status, 400);
    assert.equal((await request('/creators', json(await fields({ formToken: 'forged' })))).status, 400);
  });
  await t.test('native null/missing origins and public proxy origins save creators and appear in the owner list', async () => {
    const previousURL = process.env.ADMIN_BASE_URL;
    process.env.ADMIN_BASE_URL = 'https://creators.example.test';
    app.set('trust proxy', 1);
    const savedHandles = [];
    const submitHTML = (body, extra = {}) => request('/creators', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Forwarded-For': '192.0.2.42', ...extra }, body: new URLSearchParams(body) });
    try {
      const cases = [{ Origin: 'null', 'Sec-Fetch-Site': 'same-origin' }, {}, { Origin: process.env.ADMIN_BASE_URL, 'X-Forwarded-Proto': 'https' }];
      for (let index = 0; index < cases.length; index++) {
        const instagramHandle = 'origin_' + suffix + '_' + index;
        const response = await submitHTML(await fields({ instagramHandle, source: 'origin-regression' }), cases[index]);
        assert.equal(response.status, 303); assert.equal(response.headers.get('location'), '/creators/thanks');
        const stored = (await query('SELECT instagram_handle, source FROM creators WHERE instagram_handle = $1', [instagramHandle])).rows[0];
        assert.equal(stored.instagram_handle, instagramHandle); assert.equal(stored.source, 'origin-regression'); savedHandles.push(instagramHandle);
      }
      const listing = await request('/api/admin/creators?q=origin_' + suffix, { headers: { Cookie: cookie } });
      assert.equal(listing.status, 200); const listedHandles = (await listing.json()).creators.map((creator) => creator.instagram_handle);
      savedHandles.forEach((handle) => assert.ok(listedHandles.includes(handle)));
      const rejected = await submitHTML(await fields({ instagramHandle: 'rejected_' + suffix }), { Origin: 'https://evil.example.test' });
      assert.equal(rejected.status, 403); assert.match(rejected.headers.get('content-type'), /text\/html/); assert.ok((await rejected.text()).includes('Test Creator'));
      assert.equal((await query('SELECT id FROM creators WHERE instagram_handle = $1', ['rejected_' + suffix])).rows.length, 0);
      assert.equal((await submitHTML(await fields({ formToken: 'forged' }), { Origin: 'null' })).status, 400);
      assert.equal((await request('/creators')).headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    } finally { app.set('trust proxy', false); if (previousURL === undefined) delete process.env.ADMIN_BASE_URL; else process.env.ADMIN_BASE_URL = previousURL; }
  });
  await t.test('normal HTML submission persists profile, attribution and consent, then confirms on WhatsApp', async () => {
    const result = await request('/creators', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: base }, body: new URLSearchParams(await fields()) });
    assert.equal(result.status, 303); assert.equal(result.headers.get('location'), '/creators/thanks');
    const creator = (await query('SELECT * FROM creators WHERE instagram_handle = $1', [handle])).rows[0];
    creatorID = creator.id; assert.equal(creator.source, 'dm-batch1'); assert.equal(creator.status, 'pending'); assert.ok(creator.consent_at); assert.equal(creator.rate_per_reel, '2500.50'); assert.equal(creator.confirmation_email_status, 'disabled');
    const thanks = await request('/creators/thanks', { headers: { Cookie: result.headers.get('set-cookie').split(';')[0] } });
    const html = await thanks.text(); assert.ok(html.includes(encodeURIComponent('as @' + handle))); assert.ok(html.includes('https://wa.me/919999999999')); assert.ok(!result.headers.get('location').includes(handle));
    assert.equal(thanks.headers.get('cache-control'), 'no-store'); assert.ok(thanks.headers.get('x-robots-tag').includes('noindex'));
  });
  await t.test('owner notifications never block signup; duplicates/spam do not notify; burst and daily jobs are persistent and idempotent', async () => {
    const { notifyOwner, runScheduledNotifications, sendTestNotification } = require('../services/notifications');
    await query('DELETE FROM owner_notification_events'); await query('DELETE FROM owner_notification_deliveries');
    const previous = { NOTIFICATIONS_ENABLED: process.env.NOTIFICATIONS_ENABLED, ADMIN_BASE_URL: process.env.ADMIN_BASE_URL, BREVO_API_KEY: process.env.BREVO_API_KEY, BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL, NOTIFY_HOURLY_LIMIT: process.env.NOTIFY_HOURLY_LIMIT };
    Object.assign(process.env, { NOTIFICATIONS_ENABLED: 'true', ADMIN_BASE_URL: base, BREVO_API_KEY: 'test-notification-secret', BREVO_SENDER_EMAIL: 'verified@example.test', NOTIFY_HOURLY_LIMIT: '2' });
    app.set('trust proxy', 1);
    const captured = []; let releaseSend, started;
    const began = new Promise((resolve) => { started = resolve; });
    const waitFor = async (predicate) => { for (let attempt = 0; attempt < 100; attempt++) { if (await predicate()) return; await new Promise((resolve) => setTimeout(resolve, 20)); } throw new Error('Timed out waiting for background notification'); };
    global.fetch = async (url, options) => {
      if (!String(url).startsWith('https://api.brevo.com/')) return originalFetch(url, options);
      captured.push(JSON.parse(options.body)); started(); return new Promise((resolve) => { releaseSend = resolve; });
    };
    const headers = { Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' };
    const notifiedHandle = 'notified_' + suffix;
    try {
      const result = await Promise.race([request('/api/creators', json(await fields({ instagramHandle: notifiedHandle }), { 'X-Forwarded-For': '192.0.2.19' })), new Promise((_, reject) => setTimeout(() => reject(new Error('Signup blocked on Brevo')), 1500))]);
      assert.equal(result.status, 200);
      await Promise.race([began, new Promise((_, reject) => setTimeout(() => reject(new Error('Notification did not start')), 1500))]);
      const ownerID = (await query('SELECT id FROM creators WHERE instagram_handle = $1', [notifiedHandle])).rows[0].id;
      assert.ok(captured[0].subject.startsWith('New creator: @' + notifiedHandle));
      assert.equal(captured[0].sender.email, 'verified@example.test'); assert.equal(captured[0].to[0].email, 'owner@example.test');
      assert.ok(!captured[0].textContent.includes('919999999999')); assert.ok(!captured[0].htmlContent.includes('creator-' + suffix + '@'));
      releaseSend(new Response('{"message":"simulated failure"}', { status: 503 })); releaseSend = null;
      await waitFor(async () => (await query('SELECT status FROM owner_notification_deliveries WHERE delivery_key = $1', ['creator.joined:' + ownerID])).rows[0]?.status === 'failed');
      global.fetch = async (url, options) => {
        if (!String(url).startsWith('https://api.brevo.com/')) return originalFetch(url, options);
        captured.push(JSON.parse(options.body)); return new Response('{"messageId":"test-only"}', { status: 201 });
      };
      const post = async (body) => request('/api/creators', json(await fields(body), { 'X-Forwarded-For': '192.0.2.19' }));
      assert.equal((await post({ instagramHandle: '@' + notifiedHandle.toUpperCase() })).status, 200);
      assert.equal((await post({ consent: false })).status, 400);
      assert.equal((await post({ companyWebsite: 'spam.example' })).status, 400);
      for (let index = 0; index < 4; index++) assert.equal((await post({ instagramHandle: notifiedHandle })).status, 200);
      assert.equal((await post({ instagramHandle: 'blocked_' + suffix })).status, 429);
      assert.equal(Number((await query('SELECT COUNT(*) FROM owner_notification_events')).rows[0].count), 1);
      assert.equal(captured.length, 1);
      assert.equal((await notifyOwner({ type: 'creator.joined', creatorId: creatorID })).status, 'sent');
      const overflowID = crypto.randomUUID();
      const clone = async (id, name, source, created) => query(`INSERT INTO creators (id,full_name,instagram_handle,niche,follower_count,average_reel_views,country,rate_per_reel,whatsapp,email,source,consent_at,consent_version,created_at)
        SELECT $1,full_name,$2,niche,follower_count,average_reel_views,country,rate_per_reel,whatsapp,email,$3,consent_at,consent_version,$4 FROM creators WHERE id = $5`, [id, name, source, created, creatorID]);
      await clone(overflowID, 'overflow_' + suffix, 'burst-source', new Date());
      const overflow = await Promise.all([notifyOwner({ type: 'creator.joined', creatorId: overflowID }), notifyOwner({ type: 'creator.joined', creatorId: overflowID })]);
      assert.deepEqual(overflow.map((row) => row.status).sort(), ['duplicate', 'queued-for-summary']);
      assert.equal(captured.length, 2);
      await query("UPDATE owner_notification_deliveries SET last_attempt_at = NOW() - INTERVAL '6 minutes' WHERE delivery_key = $1", ['creator.joined:' + ownerID]);
      const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
      await runScheduledNotifications(later); await runScheduledNotifications(later);
      assert.equal(captured.filter((row) => row.subject.includes('more creators this hour')).length, 1);
      assert.equal((await query('SELECT status FROM owner_notification_deliveries WHERE delivery_key = $1', ['creator.joined:' + ownerID])).rows[0].status, 'sent');
      const priorDigest = Number((await query("SELECT COUNT(*) FROM creators WHERE created_at >= '2029-12-31T14:30:00Z' AND created_at < '2030-01-01T14:30:00Z'")).rows[0].count);
      const priorSource = Number((await query("SELECT COUNT(*) FROM creators WHERE source = 'digest-source' AND created_at >= '2029-12-31T14:30:00Z' AND created_at < '2030-01-01T14:30:00Z'")).rows[0].count);
      await clone(crypto.randomUUID(), 'digest_a_' + suffix, 'digest-source', '2030-01-01T13:00:00Z');
      await clone(crypto.randomUUID(), 'digest_b_' + suffix, 'digest-source', '2030-01-01T13:01:00Z');
      const beforeDigest = captured.length;
      await runScheduledNotifications(new Date('2030-01-01T14:35:00Z'));
      await runScheduledNotifications(new Date('2030-01-01T14:40:00Z'));
      const digest = captured.slice(beforeDigest); assert.equal(digest.length, 1); assert.ok(digest[0].subject.includes((priorDigest + 2) + ' new creators')); assert.ok(digest[0].textContent.includes('digest-source: ' + (priorSource + 2))); assert.ok(digest[0].textContent.includes('digest_a_' + suffix));
      const beforeEmpty = captured.length; await runScheduledNotifications(new Date('2031-01-01T14:35:00Z')); assert.equal(captured.length, beforeEmpty);
      assert.equal((await request('/api/admin/notifications/test', json({}))).status, 401);
      assert.equal((await request('/api/admin/notifications/test', { method: 'POST', headers: { ...headers, 'X-CSRF-Token': '' }, body: '{}' })).status, 403);
      assert.equal((await request('/api/admin/notifications/test', { method: 'POST', headers, body: '{}' })).status, 200);
      const beforeBudget = captured.length;
      await query("INSERT INTO owner_notification_deliveries (delivery_key,status,attempts,last_attempt_at) VALUES ('budget-fixture','sent',200,NOW())");
      try { assert.equal((await sendTestNotification()).status, 'daily-budget'); assert.equal(captured.length, beforeBudget); }
      finally { await query("DELETE FROM owner_notification_deliveries WHERE delivery_key = 'budget-fixture'"); }
      const warnings = [], originalWarn = console.warn;
      console.warn = (text) => warnings.push(text);
      global.fetch = async (url, options) => {
        if (!String(url).startsWith('https://api.brevo.com/')) return originalFetch(url, options);
        assert.ok(options.signal instanceof AbortSignal);
        return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('provider echoed ' + process.env.BREVO_API_KEY)), { once: true }));
      };
      try {
        const beganAt = Date.now(); assert.equal((await sendTestNotification()).status, 'failed');
        assert.ok(Date.now() - beganAt < 5000); assert.ok(warnings.length); assert.ok(!warnings.join(' ').includes(process.env.BREVO_API_KEY));
      } finally { console.warn = originalWarn; }
    } finally {
      if (releaseSend) releaseSend(new Response('{}', { status: 503 }));
      global.fetch = originalFetch; app.set('trust proxy', false);
      for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  });
  await t.test('handle variants cannot duplicate or overwrite a creator, including concurrent requests', async () => {
    const body = await fields({ instagramHandle: `https://www.instagram.com/${handle.toUpperCase()}/`, fullName: 'Attempted overwrite' });
    const results = await Promise.all([request('/api/creators', json(body)), request('/api/creators', json(body))]);
    results.forEach((result) => assert.equal(result.status, 200));
    const existing = await query('SELECT * FROM creators WHERE instagram_handle = $1', [handle]); assert.equal(existing.rows.length, 1); assert.equal(existing.rows[0].full_name, 'Test Creator');
  });
  await t.test('email failure leaves the application saved and records failed delivery', async () => {
    process.env.CREATOR_EMAIL_ENABLED = 'true'; const previousKey = process.env.BREVO_API_KEY; process.env.BREVO_API_KEY = 'fake-test-key';
    global.fetch = async (url, options) => String(url).startsWith('https://api.brevo.com/') ? new Response('{"message":"simulated failure"}', { status: 503 }) : originalFetch(url, options);
    try {
      const result = await request('/api/creators', json(await fields({ instagramHandle: handle + '_mail' }))); assert.equal(result.status, 200);
      assert.equal((await query('SELECT confirmation_email_status FROM creators WHERE instagram_handle = $1', [handle + '_mail'])).rows[0].confirmation_email_status, 'failed');
    } finally { global.fetch = originalFetch; process.env.CREATOR_EMAIL_ENABLED = 'false'; if (previousKey === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = previousKey; }
  });
  await t.test('public form rate limit rejects the ninth submission in the hour', async () => {
    // Seven requests above reached the limiter: 3 invalid, 1 insert, 2 duplicate, 1 email.
    assert.equal((await request('/api/creators', json(await fields()))).status, 200);
    assert.equal((await request('/api/creators', json(await fields()))).status, 429);
  });
  await t.test('owner can search/filter and review; CSRF, scoring and status progression are enforced', async () => {
    const headers = { Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' };
    const listing = await request('/api/admin/creators?q=' + handle + '&source=dm-batch1&status=pending', { headers });
    assert.equal(listing.status, 200); const list = await listing.json(); assert.ok(list.creators.some((creator) => creator.id === creatorID)); assert.equal(listing.headers.get('cache-control'), 'no-store');
    const patch = (body, extraHeaders = headers) => request('/api/admin/creators/' + creatorID, { method: 'PATCH', headers: extraHeaders, body: JSON.stringify(body) });
    const body = { status: 'verified', qualityScore: 85, internalNotes: 'Checked manually <script>alert(1)</script>' };
    assert.equal((await patch(body, { ...headers, 'X-CSRF-Token': '' })).status, 403);
    assert.equal((await patch(body, { ...headers, Authorization: 'Basic invalid', 'X-CSRF-Token': '' })).status, 401);
    assert.equal((await patch({ ...body, status: 'active' })).status, 409);
    assert.equal((await patch({ ...body, qualityScore: 101 })).status, 400);
    assert.equal((await patch(body)).status, 200);
    assert.equal((await patch({ ...body, status: 'active' })).status, 200);
    const creator = (await query('SELECT * FROM creators WHERE id = $1', [creatorID])).rows[0]; assert.equal(creator.status, 'active'); assert.equal(creator.quality_score, 85); assert.ok(creator.verified_at);
    const injection = await request('/api/admin/creators?q=' + encodeURIComponent("' OR 1=1 --"), { headers }); assert.equal((await injection.json()).total, 0);
    const ranges = await request('/api/admin/creators?q=' + handle + '&country=india&viewsMin=8000&viewsMax=9000&followersMin=10000&rateMax=2600&qualityMin=80&sort=quality', { headers });
    assert.equal(ranges.status, 200); assert.ok((await ranges.json()).creators.some((row) => row.id === creatorID));
    const none = await request('/api/admin/creators?q=' + handle + '&rateMax=100', { headers }); assert.equal((await none.json()).total, 0);
    const totalEntries = Number((await query('SELECT COUNT(*) FROM creators')).rows[0].count);
    const all = await (await request('/api/admin/creators', { headers })).json();
    assert.equal(all.totalEntries, totalEntries); assert.equal(all.total, totalEntries);
    const empty = await (await request('/api/admin/creators?q=missing-count-' + suffix, { headers })).json();
    assert.equal(empty.total, 0); assert.equal(empty.totalEntries, totalEntries);
    assert.equal((await request('/api/admin/creators?rateMin=1000&rateMax=100', { headers })).status, 400);
    assert.equal((await request('/api/admin/creators?sort=' + encodeURIComponent('1; DROP TABLE creators'), { headers })).status, 400);
  });
  await t.test('owner can add and complete DM profiles without emails, duplicates or weakening public validation', async () => {
    app.set('trust proxy', 1);
    const previous = { NOTIFICATIONS_ENABLED: process.env.NOTIFICATIONS_ENABLED, CREATOR_EMAIL_ENABLED: process.env.CREATOR_EMAIL_ENABLED, ADMIN_BASE_URL: process.env.ADMIN_BASE_URL, BREVO_API_KEY: process.env.BREVO_API_KEY, BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL };
    Object.assign(process.env, { NOTIFICATIONS_ENABLED: 'true', CREATOR_EMAIL_ENABLED: 'true', ADMIN_BASE_URL: base, BREVO_API_KEY: 'manual-test-key', BREVO_SENDER_EMAIL: 'verified@example.test' });
    let emails = 0;
    global.fetch = async (url, options) => { if (String(url).startsWith('https://api.brevo.com/')) { emails++; return new Response('{}', { status: 503 }); } return originalFetch(url, options); };
    const headers = { Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.81' };
    const body = { fullName: 'DM Creator', instagramHandle: '@DM_' + suffix, niche: 'Technology', country: 'India', consent: true, source: 'instagram-dm', internalNotes: 'Rate to follow in DM', status: 'active', added_by: member.id, entry_method: 'form' };
    const post = (data, extraHeaders = headers) => request('/api/admin/creators', { method: 'POST', headers: extraHeaders, body: JSON.stringify(data) });
    try {
      const page = await (await request('/admin/creators', { headers })).text();
      assert.ok(page.includes('id="add-creator"')); assert.ok(page.includes('id="manual-form"')); assert.ok(page.includes('agreed in DM'));
      assert.equal((await post(body, { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.81' })).status, 401);
      assert.equal((await post(body, { Authorization: 'Bearer ' + memberToken, 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.81' })).status, 403);
      assert.equal((await post(body, { ...headers, 'X-CSRF-Token': '' })).status, 403);
      assert.equal((await post({ ...body, consent: false })).status, 400);
      assert.equal((await post({ ...body, email: 'bad', averageReelViews: '-1' })).status, 400);
      const attempts = await Promise.all([post(body), post({ ...body, instagramHandle: 'https://www.instagram.com/' + body.instagramHandle.slice(1).toUpperCase() + '/' })]);
      assert.deepEqual(attempts.map((response) => response.status).sort(), [201, 409]);
      const saved = await attempts.find((response) => response.status === 201).json();
      const row = (await query('SELECT * FROM creators WHERE id=$1', [saved.id])).rows[0];
      assert.equal(row.entry_method, 'manual'); assert.equal(row.added_by, owner.id); assert.equal(row.status, 'pending');
      assert.equal(row.consent_version, 'creator-sharing-dm-v1'); assert.ok(row.consent_at); assert.equal(row.internal_notes, body.internalNotes);
      for (const key of ['follower_count', 'average_reel_views', 'rate_per_reel', 'whatsapp', 'email']) assert.equal(row[key], null, key);
      assert.equal(row.confirmation_email_status, 'disabled');
      assert.equal((await request('/api/creators', json(await fields({ instagramHandle: row.instagram_handle }), { 'X-Forwarded-For': '192.0.2.81' }))).status, 200);
      assert.equal((await query('SELECT full_name FROM creators WHERE id=$1', [saved.id])).rows[0].full_name, 'DM Creator');
      assert.equal((await request('/api/creators', json(await fields({ instagramHandle: 'incomplete_' + suffix, email: '', followerCount: '' }), { 'X-Forwarded-For': '192.0.2.81' }))).status, 400);
      await assert.rejects(query("INSERT INTO creators(id,full_name,instagram_handle,niche,country,consent_at,consent_version) VALUES($1,'Incomplete',$2,'Technology','India',NOW(),'test')", [crypto.randomUUID(), 'db_guard_' + suffix]), { code: '23514' });
      const edit = (data, recordID = saved.id, extraHeaders = headers) => request('/api/admin/creators/' + recordID + '/details', { method: 'PATCH', headers: extraHeaders, body: JSON.stringify(data) });
      const completed = { ...body, email: 'dm@example.test', whatsapp: '+91 99999 99999', followerCount: '25000', averageReelViews: '18000', ratePerReel: '1500.25', internalNotes: 'Complete from DM' };
      assert.equal((await edit(completed, saved.id, { ...headers, 'X-CSRF-Token': '' })).status, 403);
      assert.equal((await edit({ ...completed, ratePerReel: '-5' })).status, 400);
      assert.equal((await edit({ ...completed, instagramHandle: handle })).status, 409);
      assert.equal((await edit(completed, creatorID)).status, 404);
      assert.equal((await edit(completed)).status, 200);
      const updated = (await query('SELECT * FROM creators WHERE id=$1', [saved.id])).rows[0];
      assert.equal(updated.email, completed.email); assert.equal(updated.rate_per_reel, '1500.25'); assert.equal(updated.follower_count, '25000');
      assert.equal(updated.consent_at.toISOString(), row.consent_at.toISOString()); assert.equal(updated.status, 'pending');
      const listing = await (await request('/api/admin/creators?source=instagram-dm&viewsMin=15000', { headers })).json();
      assert.ok(listing.creators.some((creator) => creator.id === saved.id));
      assert.equal((await query('SELECT event_key FROM owner_notification_events WHERE event_key=$1', ['creator.joined:' + saved.id])).rows.length, 0);
      assert.equal(emails, 0);
    } finally {
      global.fetch = originalFetch; app.set('trust proxy', false);
      for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  });
  await t.test('webhook rejects missing/tampered signatures, accepts the signature of exact raw bytes', async () => {
    const body = '{ "triggerEvent": "BOOKING_CREATED", "payload": { "uid": "test-' + suffix + '", "attendees": [{"name":"Test", "email":"test@example.test"}] } }';
    assert.equal((await request('/api/cal/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).status, 401);
    const signature = crypto.createHmac('sha256', process.env.CAL_WEBHOOK_SECRET).update(body).digest('hex');
    const previousKey = process.env.BREVO_API_KEY; delete process.env.BREVO_API_KEY;
    try {
      assert.equal((await request('/api/cal/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Cal-Signature-256': signature }, body: body + ' ' })).status, 401);
      assert.equal((await request('/api/cal/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Cal-Signature-256': signature }, body })).status, 200);
    } finally { if (previousKey !== undefined) process.env.BREVO_API_KEY = previousKey; }
  });
  await t.test('creator deletion is owner-only, confirmed by handle, atomic and removes queued profile data', async () => {
    const id = crypto.randomUUID(), keepID = crypto.randomUUID(), handleToDelete = 'delete_' + suffix;
    for (const [recordID, instagramHandle] of [[id, handleToDelete], [keepID, 'keep_' + suffix]]) {
      await query(`INSERT INTO creators (id,full_name,instagram_handle,niche,follower_count,average_reel_views,country,rate_per_reel,whatsapp,email,source,consent_at,consent_version)
        SELECT $1,full_name,$2,niche,follower_count,average_reel_views,country,rate_per_reel,whatsapp,email,source,consent_at,consent_version FROM creators WHERE id = $3`, [recordID, instagramHandle, creatorID]);
    }
    const key = 'creator.joined:' + id;
    await query("INSERT INTO owner_notification_events (event_key,event_type,payload,occurred_at,hour_start,mode) VALUES ($1,'creator.joined',$2,NOW(),date_trunc('hour',NOW()),'summary')", [key, JSON.stringify({ handle: handleToDelete })]);
    await query("INSERT INTO owner_notification_deliveries (delivery_key,status,attempts,last_attempt_at) VALUES ($1,'sent',1,NOW())", [key]);
    const headers = { Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' };
    const remove = (body, extra = headers, recordID = id) => request('/api/admin/creators/' + recordID, { method: 'DELETE', headers: extra, body: JSON.stringify(body) });
    assert.equal((await remove({ instagramHandle: handleToDelete }, { 'Content-Type': 'application/json' })).status, 401);
    assert.equal((await remove({ instagramHandle: handleToDelete }, { Authorization: 'Bearer ' + memberToken, 'Content-Type': 'application/json' })).status, 403);
    assert.equal((await remove({ instagramHandle: handleToDelete }, { ...headers, 'X-CSRF-Token': '' })).status, 403);
    assert.equal((await remove({})).status, 400);
    assert.equal((await remove({ instagramHandle: handleToDelete }, headers, 'invalid-id')).status, 400);
    assert.equal((await remove({ instagramHandle: 'wrong_handle' })).status, 409);
    assert.equal((await query('SELECT id FROM creators WHERE id = $1', [id])).rows.length, 1);
    assert.equal((await query('SELECT event_key FROM owner_notification_events WHERE event_key = $1', [key])).rows.length, 1);
    assert.equal((await remove({ instagramHandle: handleToDelete })).status, 200);
    assert.equal((await query('SELECT id FROM creators WHERE id = $1', [id])).rows.length, 0);
    assert.equal((await query('SELECT event_key FROM owner_notification_events WHERE event_key = $1', [key])).rows.length, 0);
    assert.equal((await query('SELECT delivery_key FROM owner_notification_deliveries WHERE delivery_key = $1', [key])).rows.length, 1);
    assert.equal((await query('SELECT id FROM creators WHERE id = $1', [keepID])).rows.length, 1);
    const listing = await request('/api/admin/creators?q=' + handleToDelete, { headers }); assert.equal((await listing.json()).total, 0);
    assert.equal((await remove({ instagramHandle: handleToDelete })).status, 404);
    const previous = { NOTIFICATIONS_ENABLED: process.env.NOTIFICATIONS_ENABLED, ADMIN_BASE_URL: process.env.ADMIN_BASE_URL, BREVO_API_KEY: process.env.BREVO_API_KEY, BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL };
    Object.assign(process.env, { NOTIFICATIONS_ENABLED: 'true', ADMIN_BASE_URL: base, BREVO_API_KEY: 'test-only-key', BREVO_SENDER_EMAIL: 'verified@example.test' });
    try { assert.equal((await require('../services/notifications').notifyOwner({ type: 'creator.joined', creatorId: id })).status, 'missing-record'); }
    finally { for (const [setting, value] of Object.entries(previous)) { if (value === undefined) delete process.env[setting]; else process.env[setting] = value; } }
  });
  await t.test('logout revokes the session server-side, including a copied cookie', async () => {
    const result = await request('/api/admin/logout', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(result.status, 200); assert.equal((await request('/api/admin/creators', { headers: { Cookie: cookie } })).status, 403);
  });
});
