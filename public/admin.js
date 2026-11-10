(() => {
  let csrfToken = '';
  async function api(path, options = {}) {
    const response = await fetch('/api/admin' + path, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, ...options.headers } });
    if ([401, 403].includes(response.status) && path !== '/login') { window.location.assign('/admin/login'); throw new Error('Please sign in again.'); }
    const data = await response.json();
    if (!response.ok) { const error = new Error(data.message || 'Something went wrong. Please try again.'); error.fields = data.errors || {}; throw error; }
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
  const manualEditor = document.getElementById('manual-editor');
  const manualForm = document.getElementById('manual-form');
  const entrySummary = document.getElementById('entry-summary');
  const entryCount = document.getElementById('entry-count');
  const entryCountNote = document.getElementById('entry-count-note');
  let page = 1, selectedId = '', creators = [], initialized = false, loading = false, deleting = false, savingManual = false, editingManualId = '';
  const number = (value) => value === null || value === undefined ? 'Unknown' : Number(value).toLocaleString('en-IN');
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function cell(row, title, subtitle) { const td = node('td'); td.append(node('strong', title)); if (subtitle !== undefined) td.append(node('small', subtitle)); row.append(td); return td; }
  function openReview(creator) {
    if (loading || deleting || savingManual) return;
    selectedId = creator.id; editor.hidden = false;
    document.getElementById('editor-title').textContent = 'Review @' + creator.instagram_handle;
    const details = document.getElementById('creator-details'); details.replaceChildren();
    const fields = [['Name', creator.full_name], ['Email', creator.email || 'Not provided'], ['WhatsApp', creator.whatsapp ? '+' + creator.whatsapp : 'Not provided'], ['Added', new Date(creator.created_at).toLocaleString()], ['Entry', creator.entry_method === 'manual' ? 'Added by owner from DMs' : 'Public creator form'], ['Consent', creator.consent_version + ' · ' + new Date(creator.consent_at).toLocaleString()], ['Email status', creator.entry_method === 'manual' ? 'Not sent for manual entries' : creator.confirmation_email_status]];
    fields.forEach(([label, value]) => { details.append(node('dt', label), node('dd', value)); });
    details.append(node('dt', 'Profile'));
    const profile = node('dd'); const link = node('a', 'Open Instagram ↗'); link.href = 'https://www.instagram.com/' + encodeURIComponent(creator.instagram_handle) + '/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; profile.append(link); details.append(profile);
    document.getElementById('review-status').value = creator.status;
    document.getElementById('quality-score').value = creator.quality_score === null ? '' : creator.quality_score;
    document.getElementById('internal-notes').value = creator.internal_notes;
    document.getElementById('review-message').textContent = '';
    manualEditor.hidden = true;
    document.getElementById('editor-title').focus();
    editor.scrollIntoView({ block: 'start' });
  }
  function clearManualErrors() {
    for (const control of manualForm.elements) control.removeAttribute('aria-invalid');
    manualForm.querySelectorAll('.error').forEach((error) => { error.textContent = ''; });
  }
  function openManual(creator = null) {
    if (savingManual || deleting || loading) return;
    manualForm.reset(); clearManualErrors();
    editingManualId = creator ? creator.id : '';
    const consent = manualForm.elements.namedItem('consent');
    consent.required = !creator;
    document.getElementById('manual-consent-field').hidden = Boolean(creator);
    for (const key of ['followerCount', 'averageReelViews', 'ratePerReel', 'whatsapp', 'email']) {
      manualForm.elements.namedItem(key).required = Boolean(creator && creator.entry_method !== 'manual');
    }
    document.getElementById('manual-description').textContent = creator
      ? 'Correct the saved profile below. Enter full counts: 49,000 followers means 49000, not 49. Required fields from public submissions must stay complete.'
      : 'Enter details received in DMs. Leave unknown optional fields blank; you can fill them in later.';
    document.getElementById('manual-save-note').textContent = creator
      ? 'Existing consent, submission source type and review status are preserved. Saving corrections does not send emails.'
      : 'Saved as pending for manual review. No confirmation emails are sent for owner-entered profiles.';
    const keys = { fullName: 'full_name', instagramHandle: 'instagram_handle', niche: 'niche', country: 'country', followerCount: 'follower_count', averageReelViews: 'average_reel_views', ratePerReel: 'rate_per_reel', whatsapp: 'whatsapp', email: 'email', source: 'source', internalNotes: 'internal_notes' };
    if (creator) {
      for (const [key, column] of Object.entries(keys)) manualForm.elements.namedItem(key).value = creator[column] ?? '';
      manualForm.elements.namedItem('consent').checked = Boolean(creator.consent_at);
    }
    document.getElementById('manual-title').textContent = creator ? 'Edit @' + creator.instagram_handle : 'Add creator';
    document.getElementById('save-manual').textContent = creator ? 'Save details' : 'Save creator';
    editor.hidden = true; manualEditor.hidden = false;
    manualForm.elements.namedItem('fullName').focus(); manualEditor.scrollIntoView({ block: 'start' });
  }
  document.getElementById('add-creator').addEventListener('click', () => openManual());
  document.getElementById('edit-creator-details').addEventListener('click', () => {
    const creator = creators.find((entry) => entry.id === selectedId); if (creator) openManual(creator);
  });
  document.getElementById('close-manual').addEventListener('click', () => { if (!savingManual) { manualEditor.hidden = true; document.getElementById('add-creator').focus(); } });
  manualForm.addEventListener('submit', async (event) => {
    event.preventDefault(); if (savingManual || deleting || loading || !csrfToken) return;
    savingManual = true; clearManualErrors();
    const button = document.getElementById('save-manual'), cancel = document.getElementById('close-manual');
    const feedback = document.getElementById('manual-message');
    button.disabled = true; cancel.disabled = true;
    const body = Object.fromEntries(new FormData(manualForm)); body.consent = manualForm.elements.namedItem('consent').checked;
    try {
      const updated = Boolean(editingManualId);
      await api('/creators' + (updated ? '/' + editingManualId + '/details' : ''), { method: updated ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      manualEditor.hidden = true; manualForm.reset(); editingManualId = '';
      resetFilters(); page = 1;
      const refreshed = await load();
      message.textContent = (updated ? 'Creator details updated.' : 'Creator added as pending.') + (refreshed ? ' Showing all creators, newest first.' : ' Saved successfully; refresh the list to see the entry.');
      document.getElementById('add-creator').focus();
    } catch (err) {
      feedback.textContent = err.message;
      for (const [key, error] of Object.entries(err.fields || {})) {
        const control = manualForm.elements.namedItem(key), target = document.getElementById('manual-' + key + '-error');
        if (control && target) { control.setAttribute('aria-invalid', 'true'); target.textContent = error; }
      }
      const first = manualForm.querySelector('[aria-invalid="true"]'); if (first) first.focus();
    } finally { savingManual = false; button.disabled = false; cancel.disabled = false; }
  });
  async function deleteCreator(creator, button) {
    if (loading || deleting || savingManual) return;
    if (!window.confirm(`Permanently delete ${creator.full_name} (@${creator.instagram_handle})?\n\nTheir profile and contact details will be removed. This cannot be undone.`)) return;
    deleting = true;
    button.disabled = true;
    message.textContent = 'Deleting @' + creator.instagram_handle + '…';
    try {
      await api('/creators/' + creator.id, { method: 'DELETE', body: JSON.stringify({ instagramHandle: creator.instagram_handle }) });
      if (selectedId === creator.id) { editor.hidden = true; selectedId = ''; review.reset(); }
      if (editingManualId === creator.id) { manualEditor.hidden = true; editingManualId = ''; manualForm.reset(); }
      // Return to the previous page when deleting the last row on this page.
      if (creators.length === 1 && page > 1) page--;
      button.closest('tr').remove();
      creators = creators.filter((entry) => entry.id !== creator.id);
      const refreshed = await load();
      message.textContent = 'Deleted @' + creator.instagram_handle + '.' + (refreshed ? '' : ' Refresh the list to update the count.');
    } catch (err) { message.textContent = err.message; }
    finally { deleting = false; button.disabled = false; }
  }
  async function load() {
    if (loading) return false;
    loading = true; message.textContent = 'Loading…';
    entrySummary.setAttribute('aria-busy', 'true');
    document.getElementById('previous').disabled = true; document.getElementById('next').disabled = true;
    try {
      const params = new URLSearchParams(new FormData(filters)); params.set('page', String(page));
      const data = await api('/creators?' + params.toString()); creators = data.creators;
      const active = [...params.entries()].filter(([key, value]) => value && key !== 'page' && !(key === 'sort' && value === 'newest')).length;
      const filtered = [...params.entries()].some(([key, value]) => value && key !== 'page' && key !== 'sort');
      entryCount.textContent = number(data.totalEntries);
      entryCountNote.textContent = filtered ? number(data.total) + ' matching your filters' : 'All creators, including manual entries';
      document.getElementById('active-filter-count').textContent = active ? active + ' active filter' + (active === 1 ? '' : 's') : 'Views, rates, quality & dates';
      if (!initialized) { data.niches.forEach((niche) => { const option = node('option', niche); option.value = niche; document.getElementById('niche-filter').append(option); }); initialized = true; }
      rows.replaceChildren();
      for (const creator of creators) {
        const row = node('tr');
        cell(row, creator.full_name, '@' + creator.instagram_handle); cell(row, creator.niche, creator.country);
        cell(row, number(creator.average_reel_views) + ' avg. views', number(creator.follower_count) + ' followers');
        cell(row, creator.rate_per_reel === null ? 'Unknown' : '₹' + number(creator.rate_per_reel), creator.rate_currency);
        const sourceCell = cell(row, creator.source || 'Direct', new Date(creator.created_at).toLocaleDateString());
        if (creator.entry_method === 'manual') sourceCell.append(node('small', 'Manual entry'));
        const status = node('td'); status.append(node('span', creator.status, 'badge ' + creator.status), node('small', creator.quality_score === null ? 'Not scored' : creator.quality_score + '/100')); row.append(status);
        const action = node('td'), actions = node('div', undefined, 'row-actions');
        const button = node('button', 'Review ↗', 'button secondary review-button'); button.type = 'button'; button.addEventListener('click', () => openReview(creator));
        const edit = node('button', 'Edit', 'button secondary review-button'); edit.type = 'button'; edit.setAttribute('aria-label', 'Edit @' + creator.instagram_handle); edit.addEventListener('click', () => openManual(creator));
        const remove = node('button', 'Delete', 'button danger review-button'); remove.type = 'button'; remove.setAttribute('aria-label', 'Delete @' + creator.instagram_handle); remove.addEventListener('click', () => deleteCreator(creator, remove));
        actions.append(edit, button, remove); action.append(actions); row.append(action); rows.append(row);
      }
      if (!creators.length) { const row = node('tr'); const empty = node('td', 'No creators match these filters yet.', 'empty'); empty.colSpan = 7; row.append(empty); rows.append(row); }
      document.getElementById('result-count').textContent = data.total ? `${(page - 1) * data.limit + 1}–${Math.min(page * data.limit, data.total)} of ${data.total} creators` : '0 creators';
      document.getElementById('previous').disabled = page <= 1; document.getElementById('next').disabled = page * data.limit >= data.total;
      message.textContent = '';
      return true;
    } catch (err) { message.textContent = err.message; entryCountNote.textContent = entryCount.textContent === '—' ? 'Count unavailable. Reload to try again.' : 'Last loaded count. Refresh failed.'; return false; }
    finally { loading = false; entrySummary.setAttribute('aria-busy', 'false'); }
  }
  function resetFilters() {
    for (const control of filters.elements) { if (control.tagName === 'SELECT') control.selectedIndex = 0; else if (control.tagName === 'INPUT') control.value = ''; }
  }
  filters.addEventListener('submit', (event) => { event.preventDefault(); if (loading || deleting || savingManual) return; page = 1; editor.hidden = true; load(); });
  filters.addEventListener('reset', (event) => {
    event.preventDefault(); if (loading || deleting || savingManual) return;
    resetFilters();
    page = 1; editor.hidden = true; load();
  });
  document.getElementById('previous').addEventListener('click', () => { if (!loading && !deleting && !savingManual) { page--; editor.hidden = true; load(); } });
  document.getElementById('next').addEventListener('click', () => { if (!loading && !deleting && !savingManual) { page++; editor.hidden = true; load(); } });
  document.getElementById('close-editor').addEventListener('click', () => { editor.hidden = true; });
  review.addEventListener('submit', async (event) => {
    event.preventDefault(); if (deleting || savingManual) return; const button = review.querySelector('button[type="submit"]'); button.disabled = true;
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
