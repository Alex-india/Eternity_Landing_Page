(() => {
  let csrfToken = '';
  async function api(path, options = {}) {
    const response = await fetch('/api/admin' + path, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, ...options.headers } });
    if ([401, 403].includes(response.status) && path !== '/login') { window.location.assign('/admin/login'); throw new Error('Please sign in again.'); }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
    return data;
  }
  const login = document.getElementById('owner-login');
  if (login) {
    login.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = login.querySelector('button');
      const message = document.getElementById('login-message');
      button.disabled = true; message.textContent = '';
      try { await api('/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(login))) }); window.location.assign('/admin/creators'); }
      catch (err) { message.textContent = err.message; button.disabled = false; }
    });
    return;
  }
  const rows = document.getElementById('creator-rows');
  if (!rows) return;
  const filters = document.getElementById('filters');
  const editor = document.getElementById('creator-editor');
  const review = document.getElementById('review-form');
  const message = document.getElementById('list-message');
  let page = 1, selectedId = '', creators = [], initialized = false, loading = false;
  const number = (value) => Number(value).toLocaleString('en-IN');
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function cell(row, title, subtitle) { const td = node('td'); td.append(node('strong', title)); if (subtitle !== undefined) td.append(node('small', subtitle)); row.append(td); return td; }
  function openReview(creator) {
    selectedId = creator.id; editor.hidden = false;
    document.getElementById('editor-title').textContent = 'Review @' + creator.instagram_handle;
    const details = document.getElementById('creator-details'); details.replaceChildren();
    const fields = [['Name', creator.full_name], ['Email', creator.email], ['WhatsApp', '+' + creator.whatsapp], ['Submitted', new Date(creator.created_at).toLocaleString()], ['Consent', creator.consent_version + ' · ' + new Date(creator.consent_at).toLocaleString()], ['Email status', creator.confirmation_email_status]];
    fields.forEach(([label, value]) => { details.append(node('dt', label), node('dd', value)); });
    details.append(node('dt', 'Profile'));
    const profile = node('dd'); const link = node('a', 'Open Instagram ↗'); link.href = 'https://www.instagram.com/' + encodeURIComponent(creator.instagram_handle) + '/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; profile.append(link); details.append(profile);
    document.getElementById('review-status').value = creator.status;
    document.getElementById('quality-score').value = creator.quality_score === null ? '' : creator.quality_score;
    document.getElementById('internal-notes').value = creator.internal_notes;
    document.getElementById('review-message').textContent = '';
    document.getElementById('editor-title').focus();
    editor.scrollIntoView({ block: 'start' });
  }
  async function load() {
    if (loading) return;
    loading = true; message.textContent = 'Loading…';
    document.getElementById('previous').disabled = true; document.getElementById('next').disabled = true;
    try {
      const params = new URLSearchParams(new FormData(filters)); params.set('page', String(page));
      const data = await api('/creators?' + params.toString()); creators = data.creators;
      const active = [...params.entries()].filter(([key, value]) => value && key !== 'page' && !(key === 'sort' && value === 'newest')).length;
      document.getElementById('active-filter-count').textContent = active ? active + ' active filter' + (active === 1 ? '' : 's') : 'Views, rates, quality & dates';
      if (!initialized) { data.niches.forEach((niche) => { const option = node('option', niche); option.value = niche; document.getElementById('niche-filter').append(option); }); initialized = true; }
      rows.replaceChildren();
      for (const creator of creators) {
        const row = node('tr');
        cell(row, creator.full_name, '@' + creator.instagram_handle); cell(row, creator.niche, creator.country);
        cell(row, number(creator.average_reel_views) + ' avg. views', number(creator.follower_count) + ' followers');
        cell(row, '₹' + number(creator.rate_per_reel), creator.rate_currency); cell(row, creator.source || 'Direct', new Date(creator.created_at).toLocaleDateString());
        const status = node('td'); status.append(node('span', creator.status, 'badge ' + creator.status), node('small', creator.quality_score === null ? 'Not scored' : creator.quality_score + '/100')); row.append(status);
        const action = node('td'); const button = node('button', 'Review ↗', 'button secondary review-button'); button.type = 'button'; button.addEventListener('click', () => openReview(creator)); action.append(button); row.append(action); rows.append(row);
      }
      if (!creators.length) { const row = node('tr'); const empty = node('td', 'No creators match these filters yet.', 'empty'); empty.colSpan = 7; row.append(empty); rows.append(row); }
      document.getElementById('result-count').textContent = data.total ? `${(page - 1) * data.limit + 1}–${Math.min(page * data.limit, data.total)} of ${data.total} creators` : '0 creators';
      document.getElementById('previous').disabled = page <= 1; document.getElementById('next').disabled = page * data.limit >= data.total;
      message.textContent = '';
    } catch (err) { message.textContent = err.message; }
    finally { loading = false; }
  }
  filters.addEventListener('submit', (event) => { event.preventDefault(); if (loading) return; page = 1; editor.hidden = true; load(); });
  filters.addEventListener('reset', (event) => {
    event.preventDefault(); if (loading) return;
    for (const control of filters.elements) { if (control.tagName === 'SELECT') control.selectedIndex = 0; else if (control.tagName === 'INPUT') control.value = ''; }
    page = 1; editor.hidden = true; load();
  });
  document.getElementById('previous').addEventListener('click', () => { if (!loading) { page--; editor.hidden = true; load(); } });
  document.getElementById('next').addEventListener('click', () => { if (!loading) { page++; editor.hidden = true; load(); } });
  document.getElementById('close-editor').addEventListener('click', () => { editor.hidden = true; });
  review.addEventListener('submit', async (event) => {
    event.preventDefault(); const button = review.querySelector('button[type="submit"]'); button.disabled = true;
    const score = document.getElementById('quality-score').value;
    const feedback = document.getElementById('review-message');
    try {
      const body = { status: document.getElementById('review-status').value, qualityScore: score === '' ? null : Number(score), internalNotes: document.getElementById('internal-notes').value };
      await api('/creators/' + selectedId, { method: 'PATCH', body: JSON.stringify(body) });
      feedback.textContent = 'Review saved.'; await load();
    } catch (err) { feedback.textContent = err.message; }
    finally { button.disabled = false; }
  });
  document.getElementById('logout').addEventListener('click', async () => {
    try { await api('/logout', { method: 'POST', body: '{}' }); window.location.assign('/admin/login'); }
    catch (err) { message.textContent = err.message; }
  });
  document.getElementById('test-notification').addEventListener('click', async (event) => {
    const button = event.currentTarget, feedback = document.getElementById('notification-message');
    button.disabled = true; feedback.textContent = 'Sending test notification…';
    try { const result = await api('/notifications/test', { method: 'POST', body: '{}' }); feedback.textContent = result.message; }
    catch (err) { feedback.textContent = err.message; }
    finally { button.disabled = false; }
  });
  api('/session').then((session) => { csrfToken = session.csrfToken; return load(); }).catch((err) => { message.textContent = err.message; });
})();
