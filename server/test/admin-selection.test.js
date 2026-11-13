const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { renderCreators } = require('../views/admin');

// Exercise the real client event handlers without a browser dependency or any live account.
class Element {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.events = {}; this.value = ''; this.checked = false; this.hidden = false; this.textContent = ''; this.disabled = false; }
  addEventListener(type, action) { this.events[type] = action; }
  async fire(type) { if (this.disabled) return; return this.events[type]?.({ preventDefault() {}, currentTarget: this }); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this[key] = value; }
  removeAttribute(key) { delete this[key]; }
  querySelectorAll(selector) {
    const all = this.children.flatMap((child) => [child, ...child.querySelectorAll(selector)]);
    return selector === 'input[data-creator-id]' ? all.filter((child) => child.dataset.creatorId) : [];
  }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  scrollIntoView() {}
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('admin selection survives pagination/filtering, exports exact IDs, resets multi choices, and handles clipboard fallback', async () => {
  const html = renderCreators();
  const elements = new Map([...html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)].map((match) => [match[2], new Element(match[1])]));
  const get = (id) => elements.get(id) || null;
  const control = (name, value, type = 'text', checked = false) => Object.assign(new Element('input'), { name, value, type, checked });
  const fashion = control('niche', 'Fashion', 'checkbox', true), lifestyle = control('niche', 'Lifestyle', 'checkbox', true);
  const verified = control('status', 'verified', 'checkbox', true), active = control('status', 'active', 'checkbox', true);
  get('filters').elements = [fashion, lifestyle, verified, active, control('source', 'ig-bio'), control('rateMax', '5000')];
  get('manual-form').elements = [];
  const profile = (id, handle) => ({ id, instagram_handle: handle, full_name: handle, niche: 'Fashion', country: 'India', average_reel_views: '12000', follower_count: '49000', rate_per_reel: '2500', rate_currency: 'INR', status: 'verified', quality_score: null, source: 'ig-bio', created_at: new Date().toISOString() });
  const first = profile('first-id', 'first.creator'), second = profile('second-id', 'second.creator');
  const requests = [], copied = [];
  const context = {
    document: { getElementById: get, createElement: (tag) => new Element(tag) },
    window: { location: { assign: () => assert.fail('Unexpected login redirect') } },
    navigator: { clipboard: { writeText: async (text) => copied.push(text) } },
    URLSearchParams, URL, Blob, setTimeout,
    FormData: class {
      constructor(form) { this.entries = form.elements.filter((entry) => entry.name && (entry.type !== 'checkbox' || entry.checked)).map((entry) => [entry.name, entry.value]); }
      [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      const data = url.endsWith('/session') ? { csrfToken: 'test-csrf' }
        : url.endsWith('/export') ? { count: 2, text: '*Selected shortlist*\nBrand-ready text', filename: 'test.txt', references: [{ label: 'Creator A', name: 'Private Name', handle: 'private.handle' }] }
          : { creators: [new URL(url, 'https://example.test').searchParams.get('page') === '2' ? second : first], total: 2, totalEntries: 2, limit: 1 };
      return { ok: true, status: 200, json: async () => data };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../public/admin.js'), 'utf8'), context);
  await settle();
  assert.ok(requests[1].url.includes('niche=Fashion&niche=Lifestyle')); assert.ok(requests[1].url.includes('status=verified&status=active'));
  assert.equal(get('niche-choice-count').textContent, '2 selected');
  let checkbox = get('creator-rows').querySelectorAll('input[data-creator-id]')[0];
  checkbox.checked = true; await checkbox.fire('change');
  assert.equal(get('selected-count').textContent, '1 selected'); assert.equal(get('select-page').checked, true);
  await get('next').fire('click'); await settle();
  assert.equal(get('selected-count').textContent, '1 selected'); assert.equal(get('select-page').checked, false);
  get('select-page').checked = true; await get('select-page').fire('change');
  assert.equal(get('selected-count').textContent, '2 selected');
  await get('export-selected').fire('click'); assert.ok(get('export-message').textContent.includes('brand name')); assert.equal(requests.some((entry) => entry.url.endsWith('/export')), false);
  get('export-brand').value = 'Acme'; get('export-niche').value = 'Fashion';
  await get('export-selected').fire('click');
  const exported = requests.find((entry) => entry.url.endsWith('/export'));
  assert.deepEqual(JSON.parse(exported.options.body).ids, ['first-id', 'second-id']); assert.equal(exported.options.headers['X-CSRF-Token'], 'test-csrf');
  assert.equal(JSON.parse(exported.options.body).brandName, 'Acme'); assert.equal(JSON.parse(exported.options.body).campaignNiche, 'Fashion');
  assert.equal(get('export-preview').hidden, false); assert.ok(get('export-text').value.includes('Brand-ready'));
  assert.ok(get('export-references').children[0].textContent.includes('Private Name')); assert.ok(!get('export-text').value.includes('Private Name'));
  await get('copy-export').fire('click'); assert.equal(copied.length, 1);
  assert.ok(!copied[0].includes('private.handle'));
  context.navigator.clipboard.writeText = async () => { throw new Error('Clipboard denied'); };
  await get('copy-export').fire('click'); assert.equal(get('export-text').selected, true); assert.ok(get('export-feedback').textContent.includes('copy it manually'));
  fashion.checked = false; await get('filters').fire('submit'); await settle();
  assert.equal(get('selected-count').textContent, '2 selected'); assert.equal(get('export-preview').hidden, true);
  checkbox = get('creator-rows').querySelectorAll('input[data-creator-id]')[0]; assert.equal(checkbox.checked, true);
  await get('filters').fire('reset'); await settle();
  assert.equal(fashion.checked, false); assert.equal(lifestyle.checked, false); assert.equal(lifestyle.value, 'Lifestyle');
  assert.ok(!requests.at(-1).url.includes('niche=')); assert.equal(get('selected-count').textContent, '2 selected');
  await get('clear-selection').fire('click'); assert.equal(get('selected-count').textContent, '0 selected'); assert.equal(get('export-selected').disabled, true);
});
